// Quick script to verify withdrawal configuration
import dotenv from 'dotenv';
import Razorpay from 'razorpay';

dotenv.config();

console.log('\n=================================');
console.log('🔍 WITHDRAWAL SYSTEM CONFIGURATION CHECK');
console.log('=================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('✓ RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('✓ RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✅ Set' : '❌ Missing');
console.log('✓ RAZORPAY_ACCOUNT_NUMBER:', process.env.RAZORPAY_ACCOUNT_NUMBER || '❌ Missing');

// Check Razorpay initialization
console.log('\n🔧 Razorpay SDK:');
try {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✓ Razorpay SDK initialized: ✅');
  
  // Check for RazorpayX APIs
  console.log('\n💰 RazorpayX APIs:');
  console.log('✓ razorpay.contacts:', razorpay.contacts ? '✅ Available' : '❌ Not Available');
  console.log('✓ razorpay.fundAccount:', razorpay.fundAccount ? '✅ Available' : '❌ Not Available');
  console.log('✓ razorpay.payouts:', razorpay.payouts ? '✅ Available' : '❌ Not Available');
  
  const hasRazorpayXAPIs = razorpay.contacts && razorpay.fundAccount && razorpay.payouts;
  
  console.log('\n📊 System Status:');
  if (hasRazorpayXAPIs) {
    console.log('✅ RazorpayX APIs available - Real withdrawals will work');
    console.log('💰 Money will be transferred to bank accounts');
  } else {
    console.log('⚠️  RazorpayX APIs not available - Running in TEST MODE');
    console.log('📝 Withdrawals will be recorded but no actual transfer');
    console.log('💡 To enable real transfers, get RazorpayX API keys from:');
    console.log('   https://dashboard.razorpay.com/ → RazorpayX → Settings → API Keys');
  }
  
  console.log('\n🎯 Key Type Detection:');
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (keyId.startsWith('rzp_test_')) {
    console.log('🧪 Using TEST keys - Safe for development');
  } else if (keyId.startsWith('rzp_live_')) {
    console.log('🔴 Using LIVE keys');
    if (hasRazorpayXAPIs) {
      console.log('   ✅ RazorpayX LIVE keys - Real money transfers enabled');
    } else {
      console.log('   ⚠️  Regular Razorpay LIVE keys - Only payment gateway, no payouts');
      console.log('   💡 Need RazorpayX LIVE keys for real withdrawals');
    }
  }
  
} catch (error) {
  console.log('❌ Razorpay SDK initialization failed:', error.message);
}

console.log('\n=================================');
console.log('✅ Configuration check complete');
console.log('=================================\n');
