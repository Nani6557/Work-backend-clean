import express from "express";
import twilio from "twilio";
import { admin,getFirestore } from "../config/firebase.js";

const router = express.Router();

// ------------------------------------
// ✅ SAFE TWILIO INITIALIZATION
// ------------------------------------
let client = null;

if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log("✅ Twilio initialized");
} else {
  console.warn("⚠️ Twilio NOT initialized (missing credentials)");
}

// ------------------------------------
// ✅ FIRESTORE (NOW SAFE)
// ------------------------------------
const db = getFirestore();

if (!db) {
  throw new Error("Firestore not initialized");
}

// ------------------------------------
// ✅ RATE LIMIT (1 CALL / 60s / USER)
// ------------------------------------
const rateLimitMap = new Map();

function rateLimiter(userId) {
  const now = Date.now();
  const lastCall = rateLimitMap.get(userId);

  if (lastCall && now - lastCall < 60_000) return false;

  rateLimitMap.set(userId, now);
  return true;
}

// ------------------------------------
// A) MISSED CALL (AUTO CUT)
// ------------------------------------
router.post("/missed-call", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "Twilio not configured" });
  }

  const { workerPhone, userId, workerId } = req.body;

  if (!rateLimiter(userId)) {
    return res.status(429).json({ error: "Too many call attempts. Try later." });
  }

  try {
    const call = await client.calls.create({
      to: workerPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: "http://demo.twilio.com/docs/voice.xml",
    });

    setTimeout(async () => {
      await client.calls(call.sid).update({ status: "completed" });
    }, 3000);

    await db.collection("callLogs").add({
      type: "MISSED",
      userId,
      workerId,
      sid: call.sid,
      time: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Missed call triggered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------
// B) REAL CALL
// ------------------------------------
router.post("/real-call", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "Twilio not configured" });
  }

  const { workerPhone, userId, workerId } = req.body;

  if (!rateLimiter(userId)) {
    return res.status(429).json({ error: "Too many call attempts. Try later." });
  }

  try {
    const call = await client.calls.create({
      to: workerPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: "http://demo.twilio.com/docs/voice.xml",
    });

    await db.collection("callLogs").add({
      type: "REAL",
      userId,
      workerId,
      sid: call.sid,
      time: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Real call started",
      sid: call.sid,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------
// C) CALLBACK VERIFICATION
// ------------------------------------
router.post("/verify-callback", async (req, res) => {
  const { workerId, userId } = req.body;

  await db.collection("callbackVerifications").add({
    workerId,
    userId,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.json({ success: true, message: "Callback verified" });
});

export default router;
