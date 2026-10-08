import express from "express";

import {
  sendOTP,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetWorkerPassword,
} from "../controllers/otpController.js";

const router = express.Router();

// Existing OTP — keep it working
router.post("/send", sendOTP);

// Forgot password
router.post("/password-reset/send", sendPasswordResetOTP);
router.post("/password-reset/verify", verifyPasswordResetOTP);
router.post("/password-reset/reset", resetWorkerPassword);

export default router;
