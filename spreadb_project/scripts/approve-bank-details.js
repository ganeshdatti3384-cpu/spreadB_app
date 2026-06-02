import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Wallet from '../model/wallet_model.js';
import User from '../model/users.js';

// Load environment variables
dotenv.config();

const approveBankDetails = async (email) => {
  try {
    console.log('🚀 Bank Details Approval Script');
    console.log('======================================================================');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user by email
    console.log(`🔍 Looking for user with email: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found with this email');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   User ID: ${user._id}\n`);

    // Find wallet
    console.log('🔍 Looking for wallet...');
    const wallet = await Wallet.findOne({ userId: user._id });
    
    if (!wallet) {
      console.log('❌ Wallet not found for this user');
      process.exit(1);
    }
    
    console.log('✅ Found wallet\n');

    // Check bank details
    if (!wallet.bankDetails) {
      console.log('❌ No bank details found in wallet');
      process.exit(1);
    }

    console.log('📋 Current Bank Details:');
    console.log('   Account Holder:', wallet.bankDetails.accountHolderName);
    console.log('   Account Number:', wallet.bankDetails.accountNumber);
    console.log('   IFSC Code:', wallet.bankDetails.ifscCode);
    console.log('   Bank Name:', wallet.bankDetails.bankName || 'N/A');
    console.log('   Branch:', wallet.bankDetails.branch || 'N/A');
    console.log('   Verified:', wallet.bankDetails.verified ? '✅ Yes' : '❌ No');
    console.log('');

    if (wallet.bankDetails.verified) {
      console.log('ℹ️  Bank details are already verified!');
      process.exit(0);
    }

    // Approve bank details
    console.log('🔄 Approving bank details...');
    wallet.bankDetails.verified = true;
    await wallet.save();
    
    console.log('✅ Bank details approved successfully!\n');
    
    console.log('======================================================================');
    console.log('✨ Done! User can now withdraw money.');
    console.log('======================================================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node scripts/approve-bank-details.js <email>');
  console.log('Example: node scripts/approve-bank-details.js gantamohan.557@gmail.com');
  process.exit(1);
}

approveBankDetails(email);
