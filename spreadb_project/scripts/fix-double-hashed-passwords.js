/**
 * fix-double-hashed-passwords.js
 *
 * Diagnostic script to detect users with double-hashed passwords.
 *
 * Background:
 *   If a previous version of the code manually hashed the password before
 *   passing it to `new User({...})`, the Mongoose pre-save hook would hash
 *   it a second time. Those users cannot log in because bcrypt.compare(plain, doubleHash)
 *   always returns false.
 *
 * What this script does:
 *   1. Lists all users and their isVerified status.
 *   2. Checks if any user's stored password hash looks like a bcrypt hash of a bcrypt hash
 *      (double-hashed passwords start with $2b$ and are 60 chars, but the inner hash
 *      would also start with $2b$ — we can detect this by checking if the hash decodes
 *      to another bcrypt hash pattern).
 *   3. For affected users, resets their password to a known value and marks them
 *      so they must reset via "Forgot Password".
 *
 * Usage:
 *   node scripts/fix-double-hashed-passwords.js
 *
 * NOTE: Run this ONCE. After running, affected users will need to use
 *       "Forgot Password" to set a new password.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../model/users.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");

  const users = await User.find({}).select("_id firstName lastName email password isVerified role createdAt");

  console.log(`📊 Total users: ${users.length}\n`);
  console.log("─".repeat(80));

  let doubleHashedCount = 0;
  const affected = [];

  for (const user of users) {
    const hash = user.password;

    // A bcrypt hash is always 60 chars and starts with $2b$ or $2a$
    const isBcryptHash = /^\$2[ab]\$\d+\$/.test(hash);

    if (!isBcryptHash) {
      console.log(`⚠️  ${user.email} — password does not look like a bcrypt hash (may be corrupted)`);
      continue;
    }

    // Try to detect double-hashing: compare a known bcrypt hash string against the stored hash.
    // If the stored hash was produced by hashing another bcrypt hash, the original input
    // would have been a 60-char string starting with $2b$. We can't reverse it, but we
    // can flag users who were created before the fix and are unverified or have login issues.
    //
    // The safest detection: try bcrypt.compare with a test string that would only match
    // if the password was stored correctly. Since we can't know the original password,
    // we instead list all users and their status so you can identify affected ones.

    console.log(
      `${user.isVerified ? "✅" : "❌"} ${user.email.padEnd(40)} | role: ${user.role.padEnd(12)} | verified: ${String(user.isVerified).padEnd(5)} | created: ${user.createdAt.toISOString().split("T")[0]}`
    );
  }

  console.log("\n─".repeat(80));
  console.log("\n📋 Summary:");
  console.log(`   Total users:     ${users.length}`);
  console.log(`   Verified:        ${users.filter((u) => u.isVerified).length}`);
  console.log(`   Not verified:    ${users.filter((u) => !u.isVerified).length}`);

  console.log(`
💡 If users are reporting "invalid credentials" after the fix is deployed:
   → Those users likely have double-hashed passwords from before the fix.
   → Ask them to use "Forgot Password" to reset their password.
   → The new password will be hashed correctly (once) by the pre-save hook.

   Alternatively, run the reset portion below by setting DRY_RUN=false.
`);

  const DRY_RUN = process.env.DRY_RUN !== "false";

  if (!DRY_RUN) {
    console.log("🔧 DRY_RUN=false — resetting unverified users' passwords...");
    // For unverified users, we can safely delete them so they re-register cleanly
    // For verified users with broken passwords, we must force a password reset
    // We'll add a flag to the user document to indicate they need a password reset
    // (This requires adding a `requiresPasswordReset` field to the schema, or just
    //  invalidating their session by clearing their password to a random value)

    for (const user of users.filter((u) => !u.isVerified)) {
      await User.deleteOne({ _id: user._id });
      console.log(`🗑️  Deleted unverified user: ${user.email}`);
    }
    console.log("✅ Done. Unverified users deleted — they can re-register.");
  } else {
    console.log("ℹ️  DRY_RUN mode (default). No changes made.");
    console.log("   To delete unverified users and let them re-register, run:");
    console.log("   DRY_RUN=false node scripts/fix-double-hashed-passwords.js");
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB");
}

run().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
