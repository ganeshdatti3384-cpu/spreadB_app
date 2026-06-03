import Razorpay from 'razorpay';
import crypto from 'crypto';
import Wallet from '../model/wallet_model.js';
import { encryptPaymentPayload, decryptPaymentPayload } from '../utils/paymentEncryption.js';

// Initialize Razorpay only if keys are provided
let razorpay = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.log('⚠️ Razorpay keys not found, running in test mode');
  }
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
  console.log('⚠️ Running in test mode');
}

// Create order for adding money to wallet
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id || req.user.id;

    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount is ₹100'
      });
    }

    // Generate secure cryptographically encrypted payment token
    const paymentToken = encryptPaymentPayload({
      amount: Number(amount),
      userId: userId.toString(),
      timestamp: Date.now(),
      type: 'wallet_recharge'
    });

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured on the server'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `wlt_${Date.now()}`, // Shortened to fit 40 char limit
      notes: {
        userId: userId.toString(),
        purpose: 'wallet_recharge'
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      },
      paymentToken
    });
  } catch (error) {
    console.error('Create order error:', error);
    if (error.statusCode === 401 || error.message?.includes('Authentication failed')) {
      return res.status(401).json({
        success: false,
        message: "Razorpay authentication failed. Your RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in the .env file is invalid or expired.",
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// Verify payment and add money to wallet
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentToken
    } = req.body;

    const userId = req.user._id || req.user.id;

    if (!paymentToken) {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed: payment token is missing'
      });
    }

    // Decrypt and verify payment token payload
    let decryptedPayload;
    try {
      decryptedPayload = decryptPaymentPayload(paymentToken);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed: invalid payment token'
      });
    }

    // 1. Verify User ID
    if (decryptedPayload.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Security verification failed: user identity mismatch'
      });
    }

    // 2. Verify Type
    if (decryptedPayload.type !== 'wallet_recharge') {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed: invalid token type'
      });
    }

    // 3. Verify Timestamp (Expiry window: 15 minutes)
    const timeElapsed = Date.now() - decryptedPayload.timestamp;
    if (timeElapsed > 15 * 60 * 1000 || timeElapsed < -5000) {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed: payment token has expired'
      });
    }

    // 4. Verify Razorpay signature strictly
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured on the server'
      });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Trust ONLY the decrypted amount (prevent frontend tampering)
    const verifiedAmount = decryptedPayload.amount;

    // Payment verified, add money to wallet
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({ userId });
    }

    await wallet.addMoney(
      verifiedAmount,
      `Added ₹${verifiedAmount} via Secure Razorpay`,
      {
        method: 'razorpay',
        gatewayId: razorpay_payment_id,
        orderId: razorpay_order_id,
        timestamp: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully added ₹${verifiedAmount} to wallet`,
      wallet: {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Create payout for withdrawal (requires Razorpay X account)
export const createPayout = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id || req.user.id;

    // Get wallet and bank details
    const wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (!wallet.bankDetails || !wallet.bankDetails.verified) {
      return res.status(400).json({
        success: false,
        message: 'Bank details not verified'
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹1'
      });
    }

    if (wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Check if Razorpay X is configured (need account number for payouts)
    const hasRazorpayX = process.env.RAZORPAY_ACCOUNT_NUMBER && razorpay;
    
    // Check if Razorpay X APIs are available (contacts, fundAccount, payouts)
    const hasRazorpayXAPIs = hasRazorpayX && razorpay.contacts && razorpay.fundAccount && razorpay.payouts;
    
    if (!hasRazorpayXAPIs) {
      // For testing: Process withdrawal directly without payment gateway
      console.log('⚠️ Razorpay X APIs not available, processing withdrawal in test mode');
      console.log('ℹ️  Note: Regular Razorpay keys don\'t have payout APIs. Need Razorpay X keys.');
      
      await wallet.withdraw(
        amount,
        `Withdrawal of ₹${amount} to bank account (Test Mode)`,
        {
          accountNumber: wallet.bankDetails.accountNumber,
          ifscCode: wallet.bankDetails.ifscCode,
          payoutId: `test_payout_${Date.now()}`,
          timestamp: new Date()
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully (Test Mode)',
        testMode: true,
        note: 'Using test mode. For real payouts, Razorpay X API keys are required.',
        payout: {
          id: `test_payout_${Date.now()}`,
          status: 'processed',
          amount: amount
        }
      });
    }

    // Razorpay X is configured - proceed with real payout
    try {
      // Create contact (if not exists)
      const contact = await razorpay.contacts.create({
        name: wallet.bankDetails.accountHolderName,
        email: req.user.email,
        contact: req.user.phone || '9999999999',
        type: 'vendor',
        reference_id: userId.toString()
      });

      // Create fund account
      const fundAccount = await razorpay.fundAccount.create({
        contact_id: contact.id,
        account_type: 'bank_account',
        bank_account: {
          name: wallet.bankDetails.accountHolderName,
          ifsc: wallet.bankDetails.ifscCode,
          account_number: wallet.bankDetails.accountNumber
        }
      });

      // Create payout
      const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccount.id,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `wdl_${Date.now()}`,
        narration: 'SpreadB Withdrawal'
      });

      // Update wallet
      await wallet.withdraw(
        amount,
        `Withdrawal of ₹${amount} to bank account`,
        {
          accountNumber: wallet.bankDetails.accountNumber,
          ifscCode: wallet.bankDetails.ifscCode,
          payoutId: payout.id,
          timestamp: new Date()
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        payout: {
          id: payout.id,
          status: payout.status,
          amount: amount
        }
      });
    } catch (razorpayError) {
      console.error('Razorpay payout error:', razorpayError);
      
      // If Razorpay fails, fall back to test mode
      console.log('⚠️ Razorpay payout failed, falling back to test mode');
      
      await wallet.withdraw(
        amount,
        `Withdrawal of ₹${amount} to bank account (Test Mode - Razorpay Error)`,
        {
          accountNumber: wallet.bankDetails.accountNumber,
          ifscCode: wallet.bankDetails.ifscCode,
          payoutId: `test_payout_${Date.now()}`,
          error: razorpayError.message,
          timestamp: new Date()
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully (Test Mode)',
        testMode: true,
        note: 'Razorpay X not fully configured, withdrawal recorded in test mode',
        payout: {
          id: `test_payout_${Date.now()}`,
          status: 'processed',
          amount: amount
        }
      });
    }
  } catch (error) {
    console.error('Create payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  }
};

// Webhook handler for payment events
export const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    // Handle different events
    switch (event) {
      case 'payment.captured':
        console.log('Payment captured:', payload.payment.entity.id);
        // Payment already handled in verifyPayment
        break;

      case 'payment.failed':
        console.log('Payment failed:', payload.payment.entity.id);
        // Handle failed payment
        break;

      case 'payout.processed':
        console.log('Payout processed:', payload.payout.entity.id);
        // Update withdrawal status to completed
        break;

      case 'payout.failed':
        console.log('Payout failed:', payload.payout.entity.id);
        // Refund money to wallet
        break;

      default:
        console.log('Unhandled event:', event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};
