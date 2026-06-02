import express from "express";
import {
  userSignup,
  userLogin,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
  googleCallback,
  googleMobileAuth,
  getMe
} from "../controller/auth_controller.js";
import { protect, authorizeRoles } from "../middleware/auth_middleware.js";
import passport from "passport";

const router = express.Router();

router.post("/signup", userSignup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", userLogin);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);

// Mobile Google OAuth — receives user info from expo-auth-session
router.post("/google-mobile", googleMobileAuth);
//router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google",
  (req, res, next) => {
    req.session.role = req.query.role;  // ← SAVE ROLE
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  //passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  googleCallback
);


// Example of role-based route
router.get("/admin", authorizeRoles("Admin"), (req, res) => {
  res.json({ message: "Welcome Admin", user: req.user });
});

export default router;
