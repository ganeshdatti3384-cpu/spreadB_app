import express from "express";
import {
  getAllUsers,
  getAllTransactions,
  getWithdrawals,
  verifyBankDetails,
  updateWithdrawalStatus,
} from "../controller/admin_controller.js";
import { protect, checkRole } from "../middleware/auth_middleware.js";

const router = express.Router();

// All admin routes are protected and require Admin role
router.use(protect);
router.use(checkRole("Admin"));

// User management
router.get("/users", getAllUsers);

// Transactions logging
router.get("/transactions", getAllTransactions);

// Withdrawal operations
router.get("/withdrawals", getWithdrawals);
router.post("/withdrawals/:walletId/transaction/:txId/status", updateWithdrawalStatus);

// Bank details manual approvals
router.post("/bank-details/:userId/verify", verifyBankDetails);

export default router;
