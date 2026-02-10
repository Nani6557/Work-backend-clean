import { admin } from "../config/firebase.js";

import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
/*
export async function createOrder(req, res) {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export function verifyWebhook(req, res) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.WEBHOOK_SECRET;

    const hash = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash === signature) {
      res.json({ status: "verified" });
    } else {
      res.status(400).json({ status: "invalid signature" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
*/
export const createSubscription = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const { uid, planType } = req.body;


    if (!uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    const planMap = {
  monthly: process.env.RAZORPAY_PLAN_MONTHLY,
  halfyearly: process.env.RAZORPAY_PLAN_HALFYEARLY,
  yearly: process.env.RAZORPAY_PLAN_YEARLY,
};

const plan_id = planMap[planType];

if (!plan_id) {
  return res.status(400).json({
    error: "Invalid planType",
    receivedPlanType: planType,
  });
}
const cycleMap = {
  monthly: 12,
  halfyearly: 2,
  yearly: 1,
};

const total_count = cycleMap[planType];

const subscription = await razorpay.subscriptions.create({
  plan_id,
  customer_notify: 1,
  total_count,
});




    // Save initial subscription record
  await admin.firestore().collection("subscriptions")
.doc(uid)
.set({
  uid,
  subscriptionId: subscription.id,
  planType,
  status: "created",
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});






    return res.json({
  subscriptionId: subscription.id,
});

  } catch (error) {
    console.error("Create subscription error:", error);
    return res.status(500).json({ error: error.message });
  }
};




export const subscriptionWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  const expected = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (expected !== signature) {
    return res.status(400).send("Invalid signature");
  }

  const payload = JSON.parse(req.body.toString());
  const event = payload.event;

  if (event === "subscription.activated") {
    const subscriptionId = payload.payload.subscription.entity.id;

    const snap = await admin.firestore()
      .collection("subscriptions")
      .where("subscriptionId", "==", subscriptionId)
      .limit(1)
      .get();

    if (snap.empty) return res.send("OK");

    const doc = snap.docs[0];
    if (doc.data().status === "active") return res.send("OK");

    const { uid, planType } = doc.data();

    await admin.firestore().collection("users").doc(uid).set(
      {
        subscription: {
          active: true,
          planType,
          subscriptionId,
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    await doc.ref.update({
      status: "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  if (event === "payment.failed") {
    // mark failed
  }

  res.send("OK");
};
export const subscriptionStatus = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.json({ status: "none" });
    }

    // 1️⃣ First check USER document (FINAL truth)
const userSnap = await admin
  .firestore()
  .collection("users")
  .doc(uid)
  .get();

if (userSnap.exists) {
  const sub = userSnap.data()?.subscription;

  if (sub?.active === true) {
    return res.json({ status: "active" });
  }
}

// 2️⃣ Fallback to subscription document (pending state)
const subSnap = await admin
  .firestore()
  .collection("subscriptions")
  .doc(uid)
  .get();

if (!subSnap.exists) {
  return res.json({ status: "none" });
}

return res.json({ status: subSnap.data().status });

  } catch (err) {
    console.error("Status API error:", err);
    return res.json({ status: "error" });
  }
};
