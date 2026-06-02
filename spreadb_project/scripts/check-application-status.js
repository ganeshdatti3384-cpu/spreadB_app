/**
 * Check Application Status Script
 * 
 * This script checks the current state of applications and submissions
 * to help you understand what needs to be migrated.
 * 
 * Run with: node scripts/check-application-status.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CampaignSubmission } from '../model/campaignsubmission_model.js';
import { Application } from '../model/promotion_model.js';
import User from '../model/users.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/spreadb';

async function checkApplicationStatus() {
  try {
    console.log('🔍 Checking Application Status...');
    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get submission statistics
    const submissionStats = await CampaignSubmission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get application statistics
    const applicationStats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Find approved submissions with non-completed applications
    const approvedSubmissions = await CampaignSubmission.find({
      status: 'approved'
    }).select('_id applicationId');

    let needsMigration = 0;
    let alreadyCompleted = 0;

    for (const submission of approvedSubmissions) {
      const application = await Application.findById(submission.applicationId);
      if (application) {
        if (application.status !== 'completed') {
          needsMigration++;
        } else {
          alreadyCompleted++;
        }
      }
    }

    // Display results
    console.log('='.repeat(70));
    console.log('📊 SUBMISSION STATUS BREAKDOWN');
    console.log('='.repeat(70));
    
    if (submissionStats.length === 0) {
      console.log('No submissions found in database');
    } else {
      submissionStats.forEach(stat => {
        const emoji = stat._id === 'approved' ? '✅' : 
                     stat._id === 'rejected' ? '❌' : 
                     stat._id === 'submitted' ? '📤' : '📋';
        console.log(`${emoji} ${stat._id.padEnd(15)}: ${stat.count}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 APPLICATION STATUS BREAKDOWN');
    console.log('='.repeat(70));
    
    if (applicationStats.length === 0) {
      console.log('No applications found in database');
    } else {
      applicationStats.forEach(stat => {
        const emoji = stat._id === 'completed' ? '✅' : 
                     stat._id === 'accepted' ? '🟢' : 
                     stat._id === 'pending' ? '🟡' : 
                     stat._id === 'rejected' ? '🔴' : '📋';
        console.log(`${emoji} ${stat._id.padEnd(15)}: ${stat.count}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔄 MIGRATION STATUS');
    console.log('='.repeat(70));
    console.log(`Total approved submissions: ${approvedSubmissions.length}`);
    console.log(`✅ Already completed: ${alreadyCompleted}`);
    console.log(`⚠️  Needs migration: ${needsMigration}`);
    console.log('='.repeat(70));

    if (needsMigration > 0) {
      console.log('\n💡 RECOMMENDATION:');
      console.log(`   Run migration to update ${needsMigration} application(s) to completed status`);
      console.log('   Command: node scripts/migrate-completed-applications.js');
    } else if (approvedSubmissions.length > 0) {
      console.log('\n✨ All approved submissions have completed applications!');
      console.log('   No migration needed.');
    } else {
      console.log('\n📝 No approved submissions found.');
      console.log('   Database is in initial state.');
    }

    // Detailed breakdown
    if (needsMigration > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('📋 APPLICATIONS THAT NEED MIGRATION');
      console.log('='.repeat(70));
      
      let count = 0;
      for (const submission of approvedSubmissions) {
        const application = await Application.findById(submission.applicationId);
        
        if (application && application.status !== 'completed') {
          count++;
          console.log(`\n${count}. Application ID: ${application._id}`);
          console.log(`   Current Status: ${application.status}`);
          console.log(`   Campaign ID: ${application.campaignId}`);
          console.log(`   Influencer ID: ${application.influencerId}`);
          console.log(`   Submission ID: ${submission._id}`);
        }
      }
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Check failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the check
console.log('🚀 Application Status Check');
console.log('='.repeat(70));
checkApplicationStatus();
