import User from "../model/users.js";
import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import Wallet from "../model/wallet_model.js";

// Get all users with profile data and wallet info
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    const enhancedUsers = await Promise.all(
      users.map(async (u) => {
        const userObj = u.toObject();
        
        // Find profile
        let profile = null;
        if (u.role === "Influencer") {
          profile = await InfluencerProfile.findOne({ userId: u._id });
        } else if (u.role === "Brand Owner") {
          profile = await BrandOwnerProfile.findOne({ userId: u._id });
        }
        userObj.profile = profile;

        // Find wallet
        const wallet = await Wallet.findOne({ userId: u._id });
        userObj.wallet = wallet;

        return userObj;
      })
    );

    res.status(200).json({ success: true, users: enhancedUsers });
  } catch (error) {
    console.error("Admin getAllUsers error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all wallet and sticks transactions globally
export const getAllTransactions = async (req, res) => {
  try {
    // Get all wallets with transactions
    const wallets = await Wallet.find({}).populate("userId", "firstName lastName email role");
    
    let allWalletTx = [];
    wallets.forEach((w) => {
      if (w.transactions && w.transactions.length > 0) {
        w.transactions.forEach((tx) => {
          allWalletTx.push({
            ...tx.toObject(),
            user: w.userId,
            walletId: w._id,
            isSticks: false,
          });
        });
      }
    });

    // Get all sticks transactions from influencer profiles
    const influencers = await InfluencerProfile.find({}).populate("userId", "firstName lastName email role");
    let allSticksTx = [];
    influencers.forEach((inf) => {
      if (inf.sticks && inf.sticks.transactions && inf.sticks.transactions.length > 0) {
        inf.sticks.transactions.forEach((tx) => {
          allSticksTx.push({
            _id: tx._id,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            status: "completed",
            isSticks: true,
            user: inf.userId,
            createdAt: tx.date || tx.createdAt || new Date(),
          });
        });
      }
    });

    // Combine and sort by newest first
    const combined = [...allWalletTx, ...allSticksTx];
    combined.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    res.status(200).json({ success: true, transactions: combined });
  } catch (error) {
    console.error("Admin getAllTransactions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all withdrawal requests (pending + completed)
export const getWithdrawals = async (req, res) => {
  try {
    const wallets = await Wallet.find({}).populate("userId", "firstName lastName email");
    
    let withdrawals = [];
    wallets.forEach((w) => {
      if (w.transactions && w.transactions.length > 0) {
        w.transactions.forEach((tx) => {
          // withdrawals are debit transactions with bank transfer payment method
          if (tx.type === "debit" && tx.paymentMethod === "bank_transfer") {
            withdrawals.push({
              ...tx.toObject(),
              user: w.userId,
              walletId: w._id,
              bankDetails: w.bankDetails,
            });
          }
        });
      }
    });

    // Sort: pending first, then newest
    withdrawals.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({ success: true, withdrawals });
  } catch (error) {
    console.error("Admin getWithdrawals error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Approve bank details
export const verifyBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    if (!wallet.bankDetails) {
      return res.status(400).json({ success: false, message: "No bank details to verify" });
    }

    wallet.bankDetails.verified = true;
    await wallet.save();

    res.status(200).json({ success: true, message: "Bank details verified successfully", bankDetails: wallet.bankDetails });
  } catch (error) {
    console.error("Admin verifyBankDetails error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update withdrawal status (approve / reject)
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { walletId, txId } = req.params;
    const { status } = req.body; // 'completed' or 'failed'

    if (!["completed", "failed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const tx = wallet.transactions.id(txId);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (tx.status !== "pending") {
      return res.status(400).json({ success: false, message: "Transaction already processed" });
    }

    // Process status change
    tx.status = status;

    if (status === "failed") {
      // Refund money back to influencer
      wallet.balance += tx.amount;
      wallet.totalWithdrawn = Math.max(0, wallet.totalWithdrawn - tx.amount);
      wallet.calculateAvailableBalance();
      
      // Add refund record to log it clearly
      wallet.transactions.push({
        type: "credit",
        amount: tx.amount,
        description: `Refund: Withdrawal of ₹${tx.amount} failed/rejected by admin`,
        status: "completed",
        paymentMethod: "bank_transfer",
      });
    }

    await wallet.save();

    res.status(200).json({ success: true, message: `Withdrawal marked as ${status} successfully` });
  } catch (error) {
    console.error("Admin updateWithdrawalStatus error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
