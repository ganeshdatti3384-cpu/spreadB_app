import express from 'express';
const router = express.Router();
import * as walletController from '../controller/wallet_controller.js';
import { protect } from '../middleware/auth_middleware.js';

// Get wallet balance
router.get('/balance', protect, walletController.getWalletBalance);

// Get transactions
router.get('/transactions', protect, walletController.getTransactions);

// Check balance for promotion
router.get('/check-balance', protect, walletController.checkBalance);

// Add money to wallet (Brand Owner)
router.post('/add-money', protect, walletController.addMoney);

// Hold money for promotion (Brand Owner)
router.post('/hold', protect, walletController.holdMoneyForPromotion);

// Release held money (Cancel promotion)
router.post('/release', protect, walletController.releaseHeldMoney);

// Transfer to influencer (Complete promotion)
router.post('/transfer', protect, walletController.transferToInfluencer);

// Withdraw money (Influencer)
router.post('/withdraw', protect, walletController.withdrawMoney);

// Bank details
router.get('/bank-details', protect, walletController.getBankDetails);
router.post('/bank-details', protect, walletController.updateBankDetails);
router.post('/bank-details/verify', protect, walletController.verifyBankOtp);

// Approve bank details (Admin endpoint)
router.post('/approve-bank-details', walletController.approveBankDetails);

// Auto-approve own bank details (for testing)
router.post('/auto-approve-bank-details', protect, walletController.autoApproveBankDetails);

export default router;
