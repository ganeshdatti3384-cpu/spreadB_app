import "dotenv/config";
import mongoose from "mongoose";
import User from "./model/users.js";

const createAdmin = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    console.log("Connected to MongoDB.");

    const adminEmail = "admin@spreadb.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${adminEmail}`);
      process.exit(0);
    }

    console.log("Creating default Admin user...");
    const admin = await User.create({
      firstName: "System",
      lastName: "Administrator",
      email: adminEmail,
      password: "adminpassword123", // Password will be hashed in userSchema pre-save hook
      role: "Admin",
      isVerified: true,
    });

    console.log("Admin user created successfully!");
    console.log("-----------------------------------------");
    console.log(`Email: ${admin.email}`);
    console.log("Password: adminpassword123");
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Error creating Admin user:", error);
    process.exit(1);
  }
};

createAdmin();
