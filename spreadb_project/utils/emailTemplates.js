// ✅ OTP Email Template
export const otpEmailTemplate = (firstName, otp) => `
  <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px; max-width:500px; margin:0 auto;">
    <div style="background:#14A800; padding:20px; border-radius:10px 10px 0 0; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:24px;">SpreadB</h1>
    </div>
    <div style="background:#fff; padding:24px; border-radius:0 0 10px 10px; border:1px solid #E0E0E0;">
      <h2 style="color:#1A1A1A; margin-top:0;">Hi ${firstName},</h2>
      <p style="color:#6B6B6B;">Use the verification code below to complete your sign in or account verification:</p>
      <div style="background:#0A1628; color:#fff; font-size:32px; font-weight:bold; letter-spacing:8px; text-align:center; padding:20px; border-radius:10px; margin:20px 0;">
        ${otp}
      </div>
      <p style="color:#9B9B9B; font-size:13px;">This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border:none; border-top:1px solid #E0E0E0; margin:20px 0;" />
      <p style="color:#9B9B9B; font-size:11px; text-align:center;">SpreadB — Influence · Collaborate · Grow</p>
    </div>
  </div>
`;

// ✅ Forgot Password Email Template
export const forgotPasswordTemplate = (firstName, webResetLink, mobileResetLink) => `
  <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px; max-width:500px; margin:0 auto;">
    <div style="background:#14A800; padding:20px; border-radius:10px 10px 0 0; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:24px;">SpreadB</h1>
    </div>
    <div style="background:#fff; padding:24px; border-radius:0 0 10px 10px; border:1px solid #E0E0E0;">
      <h2 style="color:#1A1A1A; margin-top:0;">Hi ${firstName},</h2>
      <p style="color:#6B6B6B;">We received a request to reset your SpreadB password. Click the button below:</p>
      
      <div style="text-align:center; margin:24px 0;">
        <a href="${webResetLink}" style="background:#14A800; color:#fff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:bold; font-size:16px; display:inline-block;">
          Reset Password
        </a>
      </div>
      
      <p style="color:#6B6B6B; font-size:13px;">Or copy this link:</p>
      <p style="background:#f4f4f4; padding:10px; border-radius:6px; font-size:12px; word-break:break-all; color:#1A1A1A;">${webResetLink}</p>
      
      <p style="color:#9B9B9B; font-size:12px; margin-top:20px;">This link expires in <strong>1 hour</strong>.</p>
      <p style="color:#9B9B9B; font-size:12px;">If you didn't request this, ignore this email — your account is safe.</p>
      
      <hr style="border:none; border-top:1px solid #E0E0E0; margin:20px 0;" />
      <p style="color:#9B9B9B; font-size:11px; text-align:center;">SpreadB — Influence · Collaborate · Grow</p>
    </div>
  </div>
`;
