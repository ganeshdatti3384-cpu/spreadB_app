import "dotenv/config";
import express from "express";
import  connectDB  from "./config/db.js";
import auth_router from "./route/auth_router.js";
import profile_router from "./route/profile_router.js"
import passport from "passport";
import session from "express-session";
import cors from "cors";
import "./utils/passport.js";   // <--- VERY IMPORTANT
import promotion_router from "./route/promotion_router.js"
import influencer_router from "./route/influencer_application.js";
import applications_router from "./route/applications_router.js"
//import influencer_routers from "./route/influencer_routes.js";
import notifications_router from "./route/notifications_router.js"
import submission_router from "./route/submissions_routes.js";
import message_router from "./route/message_router.js";
import counting_router from "./route/counting_router.js";
import sticks_router from "./route/sticks_router.js";  // 🆕 Add sticks router
import wallet_router from "./route/wallet_router.js";  // 🆕 Add wallet router
import payment_router from "./route/payment_router.js";  // 🆕 Add payment router
import admin_router from "./route/admin_router.js";  // 🆕 Add admin router


// 🔍 DEBUG: Log environment variables on startup
console.log('=================================');
console.log('🚀 Server Starting...');
console.log('📍 FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('📍 BACKEND_URL:', process.env.BACKEND_URL);
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? '✅ set' : '❌ MISSING');
console.log('📧 EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ set' : '❌ MISSING');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? '✅ set' : '❌ MISSING');
console.log('=================================');

const app = express(); 
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, req.body);
  next();
});

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      const allowed = [
        "http://localhost:3000",
        "https://spreadbfrontend.vercel.app",
        "http://3.145.0.154",
        "https://spreadb.flyhii.in",
        "https://auth.expo.io",
      ];
      // Allow any local network IP (for mobile dev)
      if (origin.match(/^http:\/\/10\.\d+\.\d+\.\d+/) ||
          origin.match(/^http:\/\/192\.168\.\d+\.\d+/) ||
          origin.match(/^http:\/\/172\.\d+\.\d+\.\d+/) ||
          allowed.includes(origin)) {
        return callback(null, true);
      }
      callback(null, true); // Allow all for now during development
    },
    credentials: true,
  })
);
//  Required for Google OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

connectDB();

app.use("/api/uploads", express.static("uploads"));
app.use("/api/auth", auth_router);
app.use("/api/profile",profile_router)
app.use("/api/promotion",promotion_router)
app.use("/api/campaigns",influencer_router)
app.use("/api/actions",applications_router)
app.use("/api/notifications",notifications_router)
app.use("/api/submissions", submission_router);
app.use("/api/messages", message_router);
app.use("/api/counting", counting_router);
app.use("/api/sticks", sticks_router);  // 🆕 Add sticks routes
app.use("/api/wallet", wallet_router);  // 🆕 Add wallet routes
app.use("/api/payment", payment_router);  // 🆕 Add payment routes
app.use("/api/admin", admin_router);  // 🆕 Add admin routes
//app.use("/api/influencer", influencer_routers);
app.use("/api/uploads/promotions", express.static("uploads/promotions"));
app.use("/admin", express.static("../spreadb_admin"));

const PORT = 3001;
app.get("/", (req, res) => {
  res.status(200).send(`Server running on port ${PORT}`);
})

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
