import Wallet from '../model/wallet_model.js';
import { Promotion } from '../model/promotion_model.js';
import User from '../model/users.js';
import { InfluencerProfile } from '../model/profile.js';
import { sendEmail } from '../utils/sendEmail.js';

// Get wallet balance
export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId });
      await wallet.save();
    }
    wallet.calculateAvailableBalance();

    // Fetch sticks for influencers
    let sticksData = null;
    const user = await User.findById(userId).select('role');
    if (user?.role === 'Influencer') {
      let profile = await InfluencerProfile.findOne({ userId });
      if (!profile) {
        // No profile yet — return defaults
        sticksData = { free: 100, purchased: 0, total: 100, spent: 0 };
      } else {
        // Ensure sticks are initialised (backfill for old accounts)
        if (!profile.sticks || (profile.sticks.free === 0 && profile.sticks.purchased === 0 && profile.sticks.total === 0)) {
          profile.sticks = {
            free: 100,
            purchased: 0,
            total: 100,
            spent: 0,
            transactions: [{
              type: "earned",
              amount: 100,
              description: "Welcome bonus — 100 free sticks",
              date: new Date(),
            }],
          };
          await profile.save();
        }
        sticksData = {
          free: profile.sticks.free,
          purchased: profile.sticks.purchased,
          total: profile.sticks.total,
          spent: profile.sticks.spent,
        };
      }
    }

    res.status(200).json({
      success: true,
      wallet: {
        balance: wallet.balance,
        heldBalance: wallet.heldBalance,
        availableBalance: wallet.availableBalance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        totalWithdrawn: wallet.totalWithdrawn,
        // Sticks (influencer only — null for brand owners)
        sticks: sticksData?.total ?? null,
        sticksFree: sticksData?.free ?? null,
        sticksPurchased: sticksData?.purchased ?? null,
        sticksSpent: sticksData?.spent ?? null,
        bankDetailsVerified: wallet.bankDetails?.verified ?? false,
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
};

// Get wallet transactions
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { limit = 50, skip = 0, type } = req.query;
    
    let wallet = await Wallet.findOne({ userId })
      .populate('transactions.relatedPromotion', 'title')
      .populate('transactions.relatedUser', 'firstName lastName');
    
    let walletTransactions = wallet?.transactions ? wallet.transactions.map(t => ({
      ...t.toObject(),
      isSticks: false
    })) : [];

    let sticksTx = [];
    if (req.user.role === 'Influencer') {
      const profile = await InfluencerProfile.findOne({ userId });
      if (profile && profile.sticks && profile.sticks.transactions) {
        sticksTx = profile.sticks.transactions.map(t => ({
          _id: t._id,
          type: t.type, // 'earned', 'spent', 'purchased'
          amount: t.amount,
          description: t.description,
          status: 'completed',
          isSticks: true,
          freeSticksSpent: t.freeSticksSpent || 0,
          purchasedSticksSpent: t.purchasedSticksSpent || 0,
          createdAt: t.date || t.createdAt || new Date()
        }));
      }
    }

    let combined = [...walletTransactions, ...sticksTx];
    
    if (type) {
      combined = combined.filter(t => t.type === type);
    }
    
    // Sort by newest first
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const paginatedTransactions = combined.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
    
    res.status(200).json({
      success: true,
      transactions: paginatedTransactions,
      total: combined.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Add money to wallet (Brand Owner)
export const addMoney = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, paymentGatewayId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({ userId });
    }
    
    // TODO: Integrate with actual payment gateway (Razorpay/Stripe)
    // For now, we'll simulate successful payment
    
    await wallet.addMoney(amount, `Added ₹${amount} to wallet`, {
      method: paymentMethod,
      gatewayId: paymentGatewayId,
      timestamp: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: `Successfully added ₹${amount} to wallet`,
      wallet: {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance
      }
    });
  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add money to wallet',
      error: error.message
    });
  }
};

// Check if brand owner has sufficient balance for promotion
export const checkBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.query;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(200).json({
        success: true,
        hasSufficientBalance: false,
        availableBalance: 0,
        required: parseFloat(amount)
      });
    }
    
    wallet.calculateAvailableBalance();
    
    const hasSufficientBalance = wallet.availableBalance >= parseFloat(amount);
    
    res.status(200).json({
      success: true,
      hasSufficientBalance,
      availableBalance: wallet.availableBalance,
      required: parseFloat(amount),
      shortfall: hasSufficientBalance ? 0 : parseFloat(amount) - wallet.availableBalance
    });
  } catch (error) {
    console.error('Check balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check balance',
      error: error.message
    });
  }
};

// Hold money when creating promotion (Brand Owner)
export const holdMoneyForPromotion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promotionId, amount } = req.body;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    wallet.calculateAvailableBalance();
    
    if (wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        availableBalance: wallet.availableBalance,
        required: amount
      });
    }
    
    await wallet.holdMoney(amount, promotionId, `Held ₹${amount} for promotion`);
    
    res.status(200).json({
      success: true,
      message: `Successfully held ₹${amount} for promotion`,
      wallet: {
        balance: wallet.balance,
        heldBalance: wallet.heldBalance,
        availableBalance: wallet.availableBalance
      }
    });
  } catch (error) {
    console.error('Hold money error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to hold money',
      error: error.message
    });
  }
};

// Release held money (Cancel promotion)
export const releaseHeldMoney = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promotionId, amount } = req.body;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    await wallet.releaseMoney(amount, promotionId, `Released ₹${amount} from cancelled promotion`);
    
    res.status(200).json({
      success: true,
      message: `Successfully released ₹${amount}`,
      wallet: {
        balance: wallet.balance,
        heldBalance: wallet.heldBalance,
        availableBalance: wallet.availableBalance
      }
    });
  } catch (error) {
    console.error('Release money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release money',
      error: error.message
    });
  }
};

// Transfer money to influencer (Complete promotion)
export const transferToInfluencer = async (req, res) => {
  try {
    const { promotionId, influencerId, amount } = req.body;
    const brandOwnerId = req.user.id;
    
    // Get brand owner wallet
    let brandWallet = await Wallet.findOne({ userId: brandOwnerId });
    
    if (!brandWallet) {
      return res.status(400).json({
        success: false,
        message: 'Brand wallet not found'
      });
    }
    
    // Get or create influencer wallet
    let influencerWallet = await Wallet.findOne({ userId: influencerId });
    
    if (!influencerWallet) {
      influencerWallet = new Wallet({ userId: influencerId });
    }
    
    // Deduct from brand owner (from held balance)
    await brandWallet.deductMoney(amount, promotionId, `Transferred ₹${amount} to influencer`);
    
    // Add to influencer
    await influencerWallet.receiveMoney(amount, promotionId, brandOwnerId, `Received ₹${amount} from promotion`);
    
    res.status(200).json({
      success: true,
      message: `Successfully transferred ₹${amount} to influencer`,
      brandWallet: {
        balance: brandWallet.balance,
        heldBalance: brandWallet.heldBalance,
        availableBalance: brandWallet.availableBalance
      }
    });
  } catch (error) {
    console.error('Transfer money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer money',
      error: error.message
    });
  }
};

// Withdraw money (Influencer)
export const withdrawMoney = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (!wallet.bankDetails || !wallet.bankDetails.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please add and verify bank details first'
      });
    }
    
    wallet.calculateAvailableBalance();
    
    if (wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient available balance',
        availableBalance: wallet.availableBalance
      });
    }
    
    // TODO: Integrate with payment gateway for withdrawal
    
    await wallet.withdraw(amount, `Withdrawal of ₹${amount} to bank account`, {
      accountNumber: wallet.bankDetails.accountNumber,
      ifscCode: wallet.bankDetails.ifscCode,
      timestamp: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: `Withdrawal request of ₹${amount} submitted successfully`,
      wallet: {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance
      }
    });
  } catch (error) {
    console.error('Withdraw money error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process withdrawal',
      error: error.message
    });
  }
};

// Add/Update bank details
export const updateBankDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { accountHolderName, accountNumber, ifscCode, bankName, branch } = req.body;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({ userId });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    wallet.bankDetails = {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branch,
      verified: false,
      otp,
      otpExpires
    };
    
    await wallet.save();

    // Find user's email to send the OTP
    const user = await User.findById(userId);
    if (user && user.email) {
      await sendEmail(
        user.email,
        "SpreadB Bank Details Verification OTP",
        `
        <p>Hello ${user.firstName || 'User'},</p>
        <p>You have updated your bank details on SpreadB. Please use the following One-Time Password (OTP) to verify your account:</p>
        <h2 style="color: purple; font-size: 24px; letter-spacing: 2px;">${otp}</h2>
        <p>This OTP is valid for 10 minutes. If you did not request this, please contact support immediately.</p>
        `
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Bank details saved. An OTP has been sent to your email. Please verify to complete the process.',
      bankDetails: {
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
        branch,
        verified: false
      }
    });
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bank details',
      error: error.message
    });
  }
};

// Verify Bank details OTP
export const verifyBankOtp = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || !wallet.bankDetails) {
      return res.status(404).json({ success: false, message: 'Bank details not found' });
    }

    if (wallet.bankDetails.verified) {
      return res.status(200).json({ 
        success: true, 
        message: 'Bank details are already verified', 
        bankDetails: wallet.bankDetails 
      });
    }

    if (wallet.bankDetails.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > wallet.bankDetails.otpExpires) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please re-submit your bank details to request a new OTP.' });
    }

    wallet.bankDetails.verified = true;
    wallet.bankDetails.otp = undefined;
    wallet.bankDetails.otpExpires = undefined;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Bank details verified successfully',
      bankDetails: wallet.bankDetails
    });
  } catch (error) {
    console.error('Verify bank details OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify bank details OTP',
      error: error.message
    });
  }
};

// Get bank details
export const getBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet || !wallet.bankDetails) {
      return res.status(200).json({
        success: true,
        bankDetails: null
      });
    }
    
    res.status(200).json({
      success: true,
      bankDetails: wallet.bankDetails
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank details',
      error: error.message
    });
  }
};

// Approve bank details (Admin/Auto-approve for testing)
export const approveBankDetails = async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    // Find wallet by userId or email
    let wallet;
    
    if (userId) {
      wallet = await Wallet.findOne({ userId });
    } else if (email) {
      // Find user by email first
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }
      wallet = await Wallet.findOne({ userId: user._id });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId or email'
      });
    }
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (!wallet.bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'No bank details found to approve'
      });
    }
    
    // Approve bank details
    wallet.bankDetails.verified = true;
    await wallet.save();
    
    res.status(200).json({
      success: true,
      message: 'Bank details approved successfully',
      bankDetails: wallet.bankDetails
    });
  } catch (error) {
    console.error('Approve bank details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve bank details',
      error: error.message
    });
  }
};

// Auto-approve own bank details (for testing only)
export const autoApproveBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (!wallet.bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'No bank details found to approve'
      });
    }
    
    // Auto-approve
    wallet.bankDetails.verified = true;
    await wallet.save();
    
    res.status(200).json({
      success: true,
      message: 'Bank details auto-approved successfully (Test Mode)',
      bankDetails: wallet.bankDetails
    });
  } catch (error) {
    console.error('Auto-approve bank details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-approve bank details',
      error: error.message
    });
  }
};
