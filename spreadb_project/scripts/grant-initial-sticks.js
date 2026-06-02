/**
 * grant-initial-sticks.js
 *
 * One-time migration: grants 100 free sticks to every existing Influencer
 * whose InfluencerProfile has sticks.total === 0 (never received the welcome bonus).
 *
 * Usage:
 *   node scripts/grant-initial-sticks.js
 *
 * Safe to run multiple times — only updates profiles that have 0 sticks.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { InfluencerProfile } from "../model/profile.js";

dotenv.config();

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected\n");

  // Find all influencer profiles with no sticks
  const profiles = await InfluencerProfile.find({
    $or: [
      { "sticks.total": { $exists: false } },
      { "sticks.total": 0 },
      { sticks: { $exists: false } },
    ],
  }).select("_id userId email firstName sticks");

  console.log(`📊 Found ${profiles.length} influencer profile(s) with 0 sticks\n`);

  if (profiles.length === 0) {
    console.log("✅ All influencer profiles already have sticks. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    try {
      profile.sticks = {
        free: 100,
        purchased: 0,
        total: 100,
        spent: 0,
        transactions: [
          {
            type: "earned",
            amount: 100,
            description: "Welcome bonus — 100 free sticks (retroactive grant)",
            date: new Date(),
          },
        ],
      };
      await profile.save();
      console.log(`✅ Granted 100 sticks → ${profile.email || profile._id}`);
      updated++;
    } catch (err) {
      console.error(`❌ Failed for ${profile.email || profile._id}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Updated : ${updated}`);
  console.log(`❌ Skipped : ${skipped}`);
  console.log(`─────────────────────────────────`);

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
