import express from 'express';
const router = express.Router();
import * as paymentController from '../controller/payment_controller.js';
import { protect } from '../middleware/auth_middleware.js';

// Create order for payment
router.post('/create-order', protect, paymentController.createOrder);

// Verify payment
router.post('/verify', protect, paymentController.verifyPayment);

// Create payout (withdrawal)
router.post('/payout', protect, paymentController.createPayout);

// Webhook (no auth needed)
router.post('/webhook', paymentController.handleWebhook);

// Get payment details
router.get('/payment/:paymentId', protect, paymentController.getPaymentDetails);

export default router;
