import express from "express";

import {
  createSubscription,
  verifySubscriptionPayment,
  subscriptionWebhook,
  subscriptionStatus,
} from "../controllers/razorpayController.js";

const router = express.Router();

router.post(
  "/subscription/create",
  createSubscription
);

router.post(
  "/subscription/verify",
  verifySubscriptionPayment
);

router.post(
  "/razorpay/webhook",
  subscriptionWebhook
);

router.get(
  "/subscription/status",
  subscriptionStatus
);

export default router;
