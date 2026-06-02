import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    // Use same fallback as generateToken so verification doesn't fail if env var is missing
    const secret = process.env.JWT_SECRET || "secret123";
    const decoded = jwt.verify(token, secret);

    // Normalize user object so controllers can rely on consistent fields
    req.user = {
      // support multiple possible payload keys you might produce
      _id: decoded._id || decoded.id || decoded.userId || decoded.user_id,
      id: decoded.id || decoded._id || decoded.userId || decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      // include any other fields you might have encoded
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};


// ✅ Role-based middleware
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
};
