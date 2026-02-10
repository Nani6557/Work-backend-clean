import express from "express";
import {
  createSubscription,
  subscriptionWebhook,
} from "../controllers/razorpayController.js";
import { subscriptionStatus } from "../controllers/razorpayController.js";

const router = express.Router();

// frontend calls this
router.post("/subscription/create", createSubscription);

// Razorpay calls this
router.post("/razorpay/webhook", subscriptionWebhook);
router.get("/subscription/status", subscriptionStatus);

export default router;
