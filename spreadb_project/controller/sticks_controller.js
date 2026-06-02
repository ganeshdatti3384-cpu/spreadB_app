import { InfluencerProfile } from "../model/profile.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get influencer sticks balance
export const getSticksBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const profile = await InfluencerProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Return balance field for frontend compatibility
    res.status(200).json({
      balance: profile.sticks?.total || 0,
      sticks: profile.sticks || {
        free: 0,
        purchased: 0,
        total: 0,
        spent: 0,
        transactions: []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Spend sticks (for promotion bidding)
export const spendSticks = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { amount, promotionId, description } = req.body;

    const profile = await InfluencerProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Check if user has enough sticks
    if (profile.sticks.total < amount) {
      return res.status(400).json({ 
        message: "Insufficient sticks",
        available: profile.sticks.total,
        required: amount
      });
    }

    // Deduct sticks (prioritize free sticks first)
    let remainingAmount = amount;
    
    if (profile.sticks.free >= remainingAmount) {
      profile.sticks.free -= remainingAmount;
    } else {
      remainingAmount -= profile.sticks.free;
      profile.sticks.free = 0;
      profile.sticks.purchased -= remainingAmount;
    }

    profile.sticks.total -= amount;
    profile.sticks.spent += amount;

    // Add transaction record
    profile.sticks.transactions.push({
      type: 'spent',
      amount: amount,
      description: description || `Applied to promotion ${promotionId}`,
      date: new Date()
    });

    await profile.save();

    res.status(200).json({
      message: "Sticks spent successfully",
      balance: profile.sticks.total,
      sticks: profile.sticks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const profile = await InfluencerProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json({
      transactions: profile.sticks.transactions || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Razorpay order for purchasing sticks
export const createSticksOrder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { sticksAmount, price } = req.body; // sticksAmount: number of sticks, price: in INR

    console.log('Creating Razorpay order:', { userId, sticksAmount, price });

    const profile = await InfluencerProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Create Razorpay order
    const options = {
      amount: price * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `stk_${Date.now()}`, // Shortened receipt (max 40 chars)
      notes: {
        userId: userId.toString(),
        sticksAmount: sticksAmount,
        type: "sticks_purchase"
      }
    };

    console.log('Razorpay order options:', options);

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Verify Razorpay payment and add sticks
export const verifyPaymentAndAddSticks = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      sticksAmount,
      price
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Payment verified, add sticks to user account
    const profile = await InfluencerProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Add purchased sticks
    profile.sticks.purchased += sticksAmount;
    profile.sticks.total += sticksAmount;

    // Add transaction record
    profile.sticks.transactions.push({
      type: 'purchased',
      amount: sticksAmount,
      description: `Purchased ${sticksAmount} sticks for ₹${price}`,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      date: new Date()
    });

    await profile.save();

    res.status(200).json({
      message: "Payment verified and sticks added successfully",
      balance: profile.sticks.total,
      sticks: profile.sticks,
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get sticks pricing plans
export const getSticksPricing = async (req, res) => {
  try {
    const pricingPlans = [
      {
        id: 1,
        sticks: 100,
        price: 99,
        discount: 0,
        popular: false,
        description: "Starter Pack"
      },
      {
        id: 2,
        sticks: 500,
        price: 449,
        discount: 10,
        popular: true,
        description: "Most Popular"
      },
      {
        id: 3,
        sticks: 1000,
        price: 799,
        discount: 20,
        popular: false,
        description: "Best Value"
      },
      {
        id: 4,
        sticks: 5000,
        price: 3499,
        discount: 30,
        popular: false,
        description: "Professional"
      }
    ];

    res.status(200).json({ pricingPlans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
