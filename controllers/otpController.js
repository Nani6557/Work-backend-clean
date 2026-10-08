import crypto from "crypto";
import { sendOTP as sendTwilioOTP } from "../services/twilioService.js";
import { admin, getFirestore } from "../config/firebase.js";

const db = getFirestore();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}


// ====================================================
// SEND WORKER PASSWORD RESET OTP
// POST /otp/password-reset/send
// ====================================================
export async function sendPasswordResetOTP(req, res) {
  const phone = normalizePhone(req.body.phone);

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: "Phone number required",
    });
  }

  try {
    const workersSnap = await db
      .collection("workers")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (workersSnap.empty) {
      return res.status(404).json({
        success: false,
        error: "No worker found with this phone number",
      });
    }

    const workerDoc = workersSnap.docs[0];
    const uid = workerDoc.id;

    // Make sure this UID really has a Firebase Auth account
    await admin.auth().getUser(uid);

    const otp = generateOTP();
    const otpHash = hashValue(otp);

    await db.collection("passwordResetOtps").doc(uid).set({
      uid,
      phone,
      otpHash,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      verified: false,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendTwilioOTP(
      phone,
      `Your Worker App password reset OTP is ${otp}. It expires in 5 minutes.`
    );

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("SEND PASSWORD RESET OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to send OTP",
    });
  }
}


// ====================================================
// VERIFY WORKER PASSWORD RESET OTP
// POST /otp/password-reset/verify
// ====================================================
export async function verifyPasswordResetOTP(req, res) {
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || "").trim();

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: "Phone number and OTP are required",
    });
  }

  try {
    const workersSnap = await db
      .collection("workers")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (workersSnap.empty) {
      return res.status(404).json({
        success: false,
        error: "Worker not found",
      });
    }

    const uid = workersSnap.docs[0].id;

    const otpRef = db
      .collection("passwordResetOtps")
      .doc(uid);

    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return res.status(400).json({
        success: false,
        error: "OTP expired or not requested",
      });
    }

    const data = otpSnap.data();

    if (Date.now() > data.expiresAt) {
      await otpRef.delete();

      return res.status(400).json({
        success: false,
        error: "OTP expired",
      });
    }

    if ((data.attempts || 0) >= 5) {
      await otpRef.delete();

      return res.status(429).json({
        success: false,
        error: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    const incomingHash = hashValue(otp);

    if (incomingHash !== data.otpHash) {
      await otpRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
      });

      return res.status(400).json({
        success: false,
        error: "Incorrect OTP",
      });
    }

    const resetToken = generateResetToken();

    await otpRef.update({
      verified: true,
      resetTokenHash: hashValue(resetToken),
      resetTokenExpiresAt: Date.now() + RESET_TOKEN_EXPIRY_MS,
      otpHash: admin.firestore.FieldValue.delete(),
    });

    return res.json({
      success: true,
      message: "OTP verified",
      resetToken,
    });

  } catch (error) {
    console.error("VERIFY PASSWORD RESET OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to verify OTP",
    });
  }
}


// ====================================================
// RESET EXISTING WORKER FIREBASE PASSWORD
// POST /otp/password-reset/reset
// ====================================================
export async function resetWorkerPassword(req, res) {
  const phone = normalizePhone(req.body.phone);
  const resetToken = String(req.body.resetToken || "").trim();
  const newPassword = String(req.body.newPassword || "");

  if (!phone || !resetToken || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "Missing required information",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Password must contain at least 6 characters",
    });
  }

  try {
    const workersSnap = await db
      .collection("workers")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (workersSnap.empty) {
      return res.status(404).json({
        success: false,
        error: "Worker not found",
      });
    }

    const uid = workersSnap.docs[0].id;

    const otpRef = db
      .collection("passwordResetOtps")
      .doc(uid);

    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return res.status(400).json({
        success: false,
        error: "Reset session expired",
      });
    }

    const data = otpSnap.data();

    if (!data.verified) {
      return res.status(400).json({
        success: false,
        error: "OTP has not been verified",
      });
    }

    if (Date.now() > data.resetTokenExpiresAt) {
      await otpRef.delete();

      return res.status(400).json({
        success: false,
        error: "Reset session expired",
      });
    }

    if (hashValue(resetToken) !== data.resetTokenHash) {
      return res.status(400).json({
        success: false,
        error: "Invalid reset token",
      });
    }

    // IMPORTANT:
    // This updates the existing Worker Firebase Auth account.
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    // Prevent the reset token from being reused.
    await otpRef.delete();

    return res.json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("RESET WORKER PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to reset password",
    });
  }
}
