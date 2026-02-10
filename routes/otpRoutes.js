import express from 'express';
import { sendOTP } from '../controllers/otpController.js';
const router = express.Router();
router.post('/send', sendOTP);
export default router;
