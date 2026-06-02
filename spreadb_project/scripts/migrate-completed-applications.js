/**
 * Migration Script: Update Applications to Completed Status
 * 
 * This script finds all approved submissions and updates their corresponding
 * applications to "completed" status.
 * 
 * Run with: node scripts/migrate-completed-applications.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CampaignSubmission } from '../model/campaignsubmission_model.js';
import { Application } from '../model/promotion_model.js';
import User from '../model/users.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/spreadb';

async function migrateCompletedApplications() {
  try {
    console.log('🔄 Starting migration...');
    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all approved submissions
    const approvedSubmissions = await CampaignSubmission.find({
      status: 'approved'
    }).select('_id applicationId campaignId influencerId brandOwnerId');

    console.log(`\n📊 Found ${approvedSubmissions.length} approved submissions`);

    if (approvedSubmissions.length === 0) {
      console.log('✨ No approved submissions found. Database is up to date!');
      await mongoose.disconnect();
      return;
    }

    let updatedCount = 0;
    let alreadyCompletedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    console.log('\n🔄 Processing submissions...\n');

    // Process each approved submission
    for (const submission of approvedSubmissions) {
      try {
        // Find the corresponding application
        const application = await Application.findById(submission.applicationId);

        if (!application) {
          console.log(`⚠️  Application not found for submission ${submission._id}`);
          notFoundCount++;
          continue;
        }

        // Check current status
        if (application.status === 'completed') {
          console.log(`✓  Application ${application._id} already completed`);
          alreadyCompletedCount++;
          continue;
        }

        // Update to completed
        application.status = 'completed';
        await application.save();

        console.log(`✅ Updated application ${application._id} to completed`);
        console.log(`   Campaign: ${submission.campaignId}`);
        console.log(`   Influencer: ${submission.influencerId}`);
        console.log(`   Brand: ${submission.brandOwnerId}\n`);
        
        updatedCount++;
      } catch (err) {
        console.error(`❌ Error processing submission ${submission._id}:`, err.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total approved submissions: ${approvedSubmissions.length}`);
    console.log(`✅ Updated to completed: ${updatedCount}`);
    console.log(`✓  Already completed: ${alreadyCompletedCount}`);
    console.log(`⚠️  Application not found: ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

    if (updatedCount > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('💡 Tip: Refresh your frontend to see the updated statuses');
    } else {
      console.log('\n✨ No updates needed. All applications are already in correct state!');
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 Application Completion Status Migration');
console.log('='.repeat(60));
migrateCompletedApplications();
