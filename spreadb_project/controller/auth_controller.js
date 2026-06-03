import User from "../model/users.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendEmail } from "../utils/sendEmail.js";
import { otpEmailTemplate, forgotPasswordTemplate, forgotPasswordOtpTemplate } from "../utils/emailTemplates.js";
import { InfluencerProfile } from "../model/profile.js";


const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || "secret123";
  return jwt.sign(
    {
      _id: user._id,        // controllers use req.user._id
      id: user._id,         // some code expects id
      email: user.email,    // useful to decode email without DB lookup
      role: user.role
    },
    secret,
    { expiresIn: "7d" }
  );
};


// ✅ Generate random 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ Helper to hash OTP before saving
const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

// ✅ Signup with Hashed OTP
const userSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    // Strong password validation
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser)
      return res.status(400).json({ message: "An account with this email already exists" });

    const otp = generateOTP();
    const hashedOtp = await hashOtp(otp);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,          // pre-save hook hashes this — do NOT pre-hash here
      role: role || "Influencer",
      otp: hashedOtp,
      otpExpires,
    });
    await newUser.save();

    // Send OTP email — non-blocking: user is created regardless
    try {
      await sendEmail(email, "Verify Your Email - OTP", otpEmailTemplate(firstName, otp));
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      // Still return success — user can use resend OTP
    }
    return res.status(200).json({ message: "OTP sent to your email for verification." });
  } catch (err) {
    // Handle MongoDB duplicate key error gracefully
    if (err.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    console.error("Signup error:", err.message);
    return res.status(500).json({ message: "Signup failed. Please try again." });
  }
};

// ✅ Verify Hashed OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otp) return res.status(400).json({ message: "No OTP found. Please request a new one." });
    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid)
      return res.status(400).json({ message: "Invalid OTP. Please check and try again." });

    const wasAlreadyVerified = user.isVerified;
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // ── Auto-grant 100 free sticks to new Influencer accounts ──────────────
    // Only runs once: when the account is first verified (not on login OTP verify)
    if (!wasAlreadyVerified && user.role === "Influencer") {
      try {
        const existingProfile = await InfluencerProfile.findOne({ userId: user._id });
        if (existingProfile) {
          // Profile already exists — ensure sticks are initialised
          if (!existingProfile.sticks || existingProfile.sticks.total === 0) {
            existingProfile.sticks = {
              free: 100,
              purchased: 0,
              total: 100,
              spent: 0,
              transactions: [{
                type: "earned",
                amount: 100,
                description: "Welcome bonus — 100 free sticks",
                date: new Date(),
              }],
            };
            await existingProfile.save();
          }
        }
        // If no profile yet, the default schema values (free:100, total:100) handle it
        // when the profile is created during onboarding.
      } catch (sticksErr) {
        console.error("Sticks init error (non-fatal):", sticksErr.message);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const token = generateToken(user);
    return res.json({
      message: "Account verified successfully",
      token,
      userId: user._id,
      email: user.email,
      role: user.role,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      }
    });

  } catch (err) {
    console.error("Verify OTP error:", err.message);
    return res.status(500).json({ message: "Verification failed. Please try again." });
  }
};

// ✅ Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate new OTP
    const otp = generateOTP();
    const hashedOtp = await hashOtp(otp);

    user.otp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
    await user.save();

    // Non-blocking email send — OTP is already saved, don't fail the request
    try {
      await sendEmail(
        email,
        "Your New OTP Code",
        otpEmailTemplate(user.firstName, otp)
      );
      console.log(`📧 Resent OTP email to ${email}`);
    } catch (emailError) {
      console.error("Failed to resend OTP email:", emailError.message);
      // OTP is saved in DB — user can still enter it if they received a previous one
      // Don't block the response
    }

    return res.status(200).json({
      message: "A new OTP has been sent to your registered email.",
    });
  } catch (err) {
    console.error("Resend OTP error:", err.message);
    return res.status(500).json({ message: "Could not resend OTP. Please try again later." });
  }
};

// ✅ Login with Hashed OTP
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isVerified)
      return res.status(401).json({ message: "Please verify your email before logging in" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    const otp = generateOTP();
    const hashedOtp = await hashOtp(otp);
    user.otp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // Non-blocking email send
    try {
      await sendEmail(
        email,
        "Your Login OTP - Multi-Factor Authentication",
        otpEmailTemplate(user.firstName, otp)
      );
      console.log(`📧 OTP email sent to ${email}`);
    } catch (emailError) {
      console.error("❌ OTP email sending failed:", emailError.message);
      // Don't block login — user can use resend OTP
    }

    return res.status(200).json({
      message: "OTP sent to your registered email. Please verify to continue.",
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ✅ Forgot Password (OTP Based)
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    const hashedOtp = await hashOtp(otp);
    user.otp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
    await user.save();

    try {
      await sendEmail(user.email, "Password Reset OTP - SpreadB", forgotPasswordOtpTemplate(user.firstName, otp));
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    return res.json({ message: "Verification OTP sent to your email" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ✅ Verify Forgot Password OTP
const verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otp) return res.status(400).json({ message: "No OTP found. Please request a new one." });
    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid)
      return res.status(400).json({ message: "Invalid OTP. Please check and try again." });

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate secure, short-lived reset token (15 mins)
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password-reset-verified' },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "15m" }
    );

    return res.json({
      message: "OTP verified successfully",
      token: resetToken,
    });
  } catch (err) {
    console.error("Verify forgot password OTP error:", err.message);
    return res.status(500).json({ message: "Verification failed. Please try again." });
  }
};


// ✅ Show Reset Password HTML Form (Web Page Rendered by Backend)
const showResetPasswordForm = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("<h1>Token is required to reset password</h1>");

  try {
    jwt.verify(token, process.env.JWT_SECRET || "secret123");

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - SpreadB</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background: linear-gradient(135deg, #0A2010 0%, #0D3015 50%, #0A1628 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            color: #FFFFFF;
          }
          .card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 40px;
            border-radius: 20px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
            text-align: center;
          }
          h1 {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 8px;
            color: #14A800;
          }
          p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 30px;
          }
          .form-group {
            text-align: left;
            margin-bottom: 20px;
          }
          label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            color: rgba(255, 255, 255, 0.6);
          }
          input {
            width: 100%;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1.5px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            color: #FFFFFF;
            font-size: 15px;
            box-sizing: border-box;
            transition: all 0.2s ease;
          }
          input:focus {
            outline: none;
            border-color: #14A800;
            background: rgba(255, 255, 255, 0.08);
          }
          .btn {
            width: 100%;
            padding: 14px;
            background: #14A800;
            color: #FFFFFF;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s ease;
            margin-top: 10px;
          }
          .btn:hover {
            background: #118C00;
          }
          .error-msg {
            color: #EF4444;
            font-size: 13px;
            margin-top: 8px;
            display: none;
          }
          .success-msg {
            color: #10B981;
            font-size: 16px;
            font-weight: 600;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="card" id="card">
          <div id="form-container">
            <h1>Reset Password</h1>
            <p>Enter your new password below to update your account.</p>
            <form id="resetForm">
              <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" required placeholder="Minimum 8 characters">
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" required placeholder="Re-enter password">
              </div>
              <div class="error-msg" id="error">Passwords do not match.</div>
              <button type="submit" class="btn" id="submitBtn">Update Password</button>
            </form>
          </div>
          <div class="success-msg" id="success">
            <h2>Success!</h2>
            <p>Your password has been successfully reset.</p>
            <p>You can now close this tab and log in using your new password in the SpreadB app.</p>
          </div>
        </div>

        <script>
          const form = document.getElementById('resetForm');
          const passwordInput = document.getElementById('password');
          const confirmPasswordInput = document.getElementById('confirmPassword');
          const errorDiv = document.getElementById('error');
          const formContainer = document.getElementById('form-container');
          const successDiv = document.getElementById('success');
          const submitBtn = document.getElementById('submitBtn');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';

            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (password !== confirmPassword) {
              errorDiv.textContent = 'Passwords do not match.';
              errorDiv.style.display = 'block';
              return;
            }

            if (password.length < 8) {
              errorDiv.textContent = 'Password must be at least 8 characters long.';
              errorDiv.style.display = 'block';
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            try {
              const response = await fetch('/api/auth/reset-password?token=${token}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password, confirmPassword })
              });

              const result = await response.json();
              if (response.ok) {
                formContainer.style.display = 'none';
                successDiv.style.display = 'block';
              } else {
                errorDiv.textContent = result.message || 'Failed to reset password.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Password';
              }
            } catch (err) {
              errorDiv.textContent = 'An error occurred. Please try again.';
              errorDiv.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Update Password';
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(400).send("<h1>Invalid or expired token link. Please request a new password reset link.</h1>");
  }
};

// ✅ Change Password for Logged-In Users
const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  // Validate password strength
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    return res.status(500).json({ message: "Failed to change password" });
  }
};

// ✅ Reset Password
const resetPassword = async (req, res) => {
  const token = req.query.token || req.body.token || req.headers.authorization?.split(" ")[1];
  const { password, confirmPassword } = req.body;

  if (!token) return res.status(400).json({ message: "Token required" });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  // Strong password validation
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongPasswordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    
    // Verify token type for password reset security
    if (decoded.type !== 'password-reset-verified') {
      return res.status(400).json({ message: "Invalid token type for password reset" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};
// ✅ Refresh Token
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    const newToken = generateToken({ _id: decoded.id, role: decoded.role });
    return res.json({ message: "Token refreshed", token: newToken });
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

//google oath
const googleCallback = async (req, res) => {
  try {
    console.log('🔍 Google Callback - FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('🔍 Google Callback - BACKEND_URL:', process.env.BACKEND_URL);
    
    if (!req.user) {
      // Hardcoded URL for Google OAuth
      const redirectUrl = `${process.env.FRONTEND_URL}/login?error=auth_failed`;
      console.log('❌ No user found, redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    }

    const user = req.user;

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Hardcoded URL for Google OAuth - bypassing environment variable
    const redirectUrl = `${process.env.FRONTEND_URL}/login?token=${token}&role=${encodeURIComponent(user.role)}&email=${encodeURIComponent(user.email)}`;
    console.log('✅ User authenticated, redirecting to:', redirectUrl);
    
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("Google OAuth Error:", error);
    // Hardcoded URL for Google OAuth
    const redirectUrl = `${process.env.FRONTEND_URL}/login?error=server_error`;
    console.log('❌ Error occurred, redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpires');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return both wrapped and flat so mobile (res.data?.user || res.data) works either way
    res.status(200).json({ user, ...user.toObject() });
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Google Mobile Auth — for Expo/React Native apps
// Receives user info from expo-auth-session Google flow
const googleMobileAuth = async (req, res) => {
  try {
    const { email, googleId, firstName, lastName, role } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ message: "Email and Google ID are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Update googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        await user.save();
      }
    } else {
      // Create new Google user — password won't be used for login
      // Use a random secure string so the pre-save hook hashes something valid
      const randomPass = `google_${googleId}_${Date.now()}`;
      user = new User({
        firstName: firstName || normalizedEmail.split("@")[0],
        lastName: lastName || "",
        email: normalizedEmail,
        googleId,
        role: role || "Influencer",
        password: randomPass,
        isVerified: true,
      });
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Google authentication successful",
      token,
      userId: user._id,
      email: user.email,
      role: user.role,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Google Mobile Auth Error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    return res.status(500).json({ message: "Google authentication failed. Please try again." });
  }
};

export {
  userSignup,
  verifyOtp,
  userLogin,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
  showResetPasswordForm,
  changePassword,
  refreshToken,
  resendOtp,
  googleCallback,
  googleMobileAuth,
  getMe
};





// import User from "../model/users.js";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

// // ✅ Create JWT token
// const generateToken = (user) => {
//   return jwt.sign(
//     { id: user._id, role: user.role },
//     process.env.JWT_SECRET || "secret123",
//     { expiresIn: "1h" }
//   );
// };

// // ✅ Signup
// const userSignup = async (req, res) => {
//   try {
//     const { firstName, lastName, email, password,confirmPassword, role } = req.body;

//     if (!firstName || !lastName || !email || !password || !confirmPassword || !role) {
//       return res.status(400).json({ message: "All fields are required." });
//     }
//     // Passwords must match
//     if (password !== confirmPassword) {
//       return res.status(400).json({ message: "Passwords do not match." });
//     }
//     // Strong password validation
//     const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
//     if (!strongPasswordRegex.test(password)) {
//       return res.status(400).json({
//         message:
//           "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
//       });
//     }
//     const existingUser = await User.findOne({ email });
//     if (existingUser)
//       return res.status(400).json({ message: "User already exists" });

//     // Create new user
//     const newUser = new User({
//       firstName,
//       lastName,
//       email,
//       password,
//       role,
//     });
//     await newUser.save();

//     const token = generateToken(newUser);
//     return res.status(201).json({ message: "Signup successful", token, user: newUser });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// // ✅ Login
// const userLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user)
//       return res.status(404).json({ message: "Invalid email or password" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ message: "Invalid email or password" });

//     const token = generateToken(user);
//     return res.status(200).json({
//       message: "Login successful",
//       token,
//       user,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };


// // ✅ Refresh Token
// const refreshToken = async (req, res) => {
//   try {
//     const { token } = req.body;
//     if (!token) return res.status(400).json({ message: "Token required" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
//     const newToken = generateToken({ _id: decoded.id, role: decoded.role });
//     return res.json({ message: "Token refreshed", token: newToken });
//   } catch (err) {
//     return res.status(400).json({ message: "Invalid or expired token" });
//   }
// };

// // ✅ Forgot Password
// const forgotPassword = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const resetToken = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET || "secret123",
//       { expiresIn: "1h" }
//     );

//     // Simulate email sending
//     const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
//     console.log("Reset Link:", resetLink);

//     return res.json({ message: "Password reset link sent to email", resetLink });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// // ✅ Reset Password
// const resetPassword = async (req, res) => {
//   const { token } = req.query;
//   const { password, confirmPassword } = req.body;

//   if (!token) return res.status(400).json({ message: "Token is required" });
//   if (password !== confirmPassword)
//     return res.status(400).json({ message: "Passwords do not match" });

//   // Validate password strength
//   const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
//   if (!strongPasswordRegex.test(password)) {
//     return res.status(400).json({
//       message:
//         "Password must be 8+ chars, with uppercase, lowercase, and number.",
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
//     const user = await User.findOne({ _id: decoded.userId });
//     if (!user) return res.status(404).json({ message: "Invalid or expired token" });

//     user.password = password; // pre-save hook hashes automatically
//     await user.save();

//     return res.json({ message: "Password reset successful" });
//   } catch (err) {
//     return res.status(400).json({ message: "Invalid or expired token" });
//   }
// };

// export {
//   userSignup,
//   userLogin,
//   refreshToken,
//   forgotPassword,
//   resetPassword,
// };
