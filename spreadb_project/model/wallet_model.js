import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'debit', 'hold', 'release', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  relatedPromotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentGatewayId: String,
  paymentMethod: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  heldBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  transactions: [transactionSchema],
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branch: String,
    verified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Calculate available balance
walletSchema.methods.calculateAvailableBalance = function() {
  this.availableBalance = this.balance - this.heldBalance;
  return this.availableBalance;
};

// Add money to wallet
walletSchema.methods.addMoney = async function(amount, description, paymentDetails) {
  this.balance += amount;
  this.availableBalance = this.calculateAvailableBalance();
  
  this.transactions.push({
    type: 'credit',
    amount,
    description,
    status: 'completed',
    paymentGatewayId: paymentDetails?.gatewayId,
    paymentMethod: paymentDetails?.method,
    metadata: paymentDetails
  });
  
  return await this.save();
};

// Hold money for promotion
walletSchema.methods.holdMoney = async function(amount, promotionId, description) {
  if (this.availableBalance < amount) {
    throw new Error('Insufficient balance');
  }
  
  this.heldBalance += amount;
  this.availableBalance = this.calculateAvailableBalance();
  
  this.transactions.push({
    type: 'hold',
    amount,
    description,
    status: 'completed',
    relatedPromotion: promotionId
  });
  
  return await this.save();
};

// Release held money (cancel promotion)
walletSchema.methods.releaseMoney = async function(amount, promotionId, description) {
  this.heldBalance -= amount;
  this.availableBalance = this.calculateAvailableBalance();
  
  this.transactions.push({
    type: 'release',
    amount,
    description,
    status: 'completed',
    relatedPromotion: promotionId
  });
  
  return await this.save();
};

// Transfer money to influencer
walletSchema.methods.deductMoney = async function(amount, promotionId, description) {
  this.heldBalance -= amount;
  this.balance -= amount;
  this.totalSpent += amount;
  this.availableBalance = this.calculateAvailableBalance();
  
  this.transactions.push({
    type: 'debit',
    amount,
    description,
    status: 'completed',
    relatedPromotion: promotionId
  });
  
  return await this.save();
};

// Receive money from brand
walletSchema.methods.receiveMoney = async function(amount, promotionId, fromUserId, description) {
  this.balance += amount;
  this.totalEarned += amount;
  this.availableBalance = this.calculateAvailableBalance();
  
  this.transactions.push({
    type: 'transfer',
    amount,
    description,
    status: 'completed',
    relatedPromotion: promotionId,
    relatedUser: fromUserId
  });
  
  return await this.save();
};

// Withdraw money
walletSchema.methods.withdraw = async function(amount, description, withdrawalDetails) {
  if (this.availableBalance < amount) {
    throw new Error('Insufficient available balance');
  }
  
  this.balance -= amount;
  this.totalWithdrawn += amount;
  this.availableBalance = this.calculateAvailableBalance();
  
  this.transactions.push({
    type: 'debit',
    amount,
    description,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    metadata: withdrawalDetails
  });
  
  return await this.save();
};

export default mongoose.model('Wallet', walletSchema);
