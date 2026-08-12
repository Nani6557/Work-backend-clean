import { admin } from "../config/firebase.js";

import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
  quantity: 1,
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


export const verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      uid,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = req.body;

    if (
      !uid ||
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing payment verification details",
      });
    }

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_payment_id}|${razorpay_subscription_id}`
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
      });
    }

    const subscriptionSnap = await admin
      .firestore()
      .collection("subscriptions")
      .doc(uid)
      .get();

    if (!subscriptionSnap.exists) {
      return res.status(404).json({
        success: false,
        error: "Subscription record not found",
      });
    }

    const subscriptionData =
      subscriptionSnap.data();

    if (
      subscriptionData.subscriptionId !==
      razorpay_subscription_id
    ) {
      return res.status(400).json({
        success: false,
        error: "Subscription ID mismatch",
      });
    }

    await admin
      .firestore()
      .collection("subscriptions")
      .doc(uid)
      .update({
        status: "verified",
        paymentId: razorpay_payment_id,
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

    return res.json({
      success: true,
    });

  } catch (error) {
    console.error(
      "Verify subscription payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Payment verification failed",
    });
  }
};



export const subscriptionWebhook = async (req, res) => {
  try {
    const signature =
      req.headers["x-razorpay-signature"];

    if (!signature) {
      return res
        .status(400)
        .send("Missing Razorpay signature");
    }

    // IMPORTANT:
    // req.body must be the RAW webhook body.
    const expected = crypto
      .createHmac(
        "sha256",
        process.env.WEBHOOK_SECRET
      )
      .update(req.body)
      .digest("hex");

    if (expected !== signature) {
      console.error(
        "Invalid Razorpay webhook signature"
      );

      return res
        .status(400)
        .send("Invalid signature");
    }

    const payload = JSON.parse(
      req.body.toString()
    );

    const event = payload.event;

    console.log(
      "Razorpay webhook received:",
      event
    );

    const subscription =
      payload.payload?.subscription?.entity;

    if (!subscription?.id) {
      console.log(
        "No subscription entity in webhook"
      );

      return res.send("OK");
    }

    const subscriptionId = subscription.id;

    const snap = await admin
      .firestore()
      .collection("subscriptions")
      .where(
        "subscriptionId",
        "==",
        subscriptionId
      )
      .limit(1)
      .get();

    if (snap.empty) {
      console.log(
        "Subscription not found:",
        subscriptionId
      );

      return res.send("OK");
    }

    const doc = snap.docs[0];
    const data = doc.data();

    const uid = data.uid;
    const planType = data.planType;

    // --------------------------------
    // ACTIVATED
    // --------------------------------

   if (event === "subscription.activated") {

  const currentEnd = subscription.current_end || null;

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .set(
      {
        subscription: {
          active: true,
          planType,
          subscriptionId,
          currentEnd,
          activatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

  await doc.ref.update({
    status: "active",
    currentEnd,
    updatedAt:
      admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    "Subscription activated:",
    subscriptionId,
    "currentEnd:",
    currentEnd
  );
}

      await doc.ref.update({
        status: "active",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription activated:",
        subscriptionId
      );
    }

    // --------------------------------
    // SUCCESSFUL RENEWAL
    // --------------------------------

  else if (event === "subscription.charged") {

  const currentEnd = subscription.current_end || null;

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .set(
      {
        subscription: {
          active: true,
          planType,
          subscriptionId,
          currentEnd,
          lastChargedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

  await doc.ref.update({
    status: "active",
    currentEnd,
    updatedAt:
      admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    "Subscription charged:",
    subscriptionId,
    "new currentEnd:",
    currentEnd
  );
}

    // --------------------------------
    // PAYMENT RETRY / PENDING
    // --------------------------------

    else if (
      event === "subscription.pending"
    ) {
      await doc.ref.update({
        status: "pending",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription pending:",
        subscriptionId
      );
    }

    // --------------------------------
    // HALTED
    // --------------------------------

    else if (
      event === "subscription.halted"
    ) {
      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            subscription: {
              active: false,
              planType,
              subscriptionId,
              haltedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          },
          { merge: true }
        );

      await doc.ref.update({
        status: "halted",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription halted:",
        subscriptionId
      );
    }

    // --------------------------------
    // CANCELLED
    // --------------------------------

    else if (
      event === "subscription.cancelled"
    ) {
      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            subscription: {
              active: false,
              planType,
              subscriptionId,
              cancelledAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          },
          { merge: true }
        );

      await doc.ref.update({
        status: "cancelled",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription cancelled:",
        subscriptionId
      );
    }

    // --------------------------------
    // PAUSED
    // --------------------------------

    else if (
      event === "subscription.paused"
    ) {
      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            subscription: {
              active: false,
              planType,
              subscriptionId,
              pausedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          },
          { merge: true }
        );

      await doc.ref.update({
        status: "paused",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription paused:",
        subscriptionId
      );
    }

    // --------------------------------
    // RESUMED
    // --------------------------------

    else if (
      event === "subscription.resumed"
    ) {
      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            subscription: {
              active: true,
              planType,
              subscriptionId,
              resumedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          },
          { merge: true }
        );

      await doc.ref.update({
        status: "active",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription resumed:",
        subscriptionId
      );
    }

    // --------------------------------
    // COMPLETED
    // --------------------------------

    else if (
      event === "subscription.completed"
    ) {
      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            subscription: {
              active: false,
              planType,
              subscriptionId,
              completedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          },
          { merge: true }
        );

      await doc.ref.update({
        status: "completed",
        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp(),
      });

      console.log(
        "Subscription completed:",
        subscriptionId
      );
    }

    else {
      console.log(
        "Unhandled Razorpay event:",
        event
      );
    }

    return res.send("OK");

  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    return res
      .status(500)
      .send("Webhook processing failed");
  }
};


export const subscriptionStatus = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.json({
        status: "none",
      });
    }

    // First check the user's final subscription state
    const userSnap = await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (userSnap.exists) {
      const subscription =
        userSnap.data()?.subscription;

     if (subscription?.active === true) {

  const currentEnd = subscription.currentEnd;

  // If Razorpay gave us an expiry timestamp,
  // make sure the subscription has not expired.
  if (
    currentEnd &&
    Date.now() >= currentEnd * 1000
  ) {
    return res.json({
      status: "expired",
    });
  }

  return res.json({
    status: "active",
  });
}
    }

    // If not active, check the subscription record
    const subscriptionSnap = await admin
      .firestore()
      .collection("subscriptions")
      .doc(uid)
      .get();

    if (!subscriptionSnap.exists) {
      return res.json({
        status: "none",
      });
    }

    return res.json({
      status: subscriptionSnap.data().status || "none",
    });

  } catch (error) {
    console.error(
      "Subscription status error:",
      error
    );

    return res.json({
      status: "error",
    });
  }
};
