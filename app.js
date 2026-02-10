import "dotenv/config";





import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import crypto from "crypto";

import { initFirebase } from "./config/firebase.js";
import twilioRoutes from "./routes/twilioRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import agoraRoutes from "./routes/agoraRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import razorpayRoutes from "./routes/razorpayRoutes.js";


const app = express();
// 🔥 Razorpay webhook MUST use raw body
app.use(
  "/api/razorpay/webhook",
  bodyParser.raw({ type: "*/*" })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initFirebase();

// ✅ ROUTES USED BY FRONTEND
app.use("/auth", authRoutes);
app.use("/otp", otpRoutes);
app.use("/user", userRoutes);
app.use("/conversations", conversationRoutes);
app.use("/agora", agoraRoutes);
app.use("/api", razorpayRoutes);        // Razorpay subscription APIs



app.use("/twilio", twilioRoutes);
// ✅ REQUIRED FOR FRONTEND
app.use("/api", userRoutes);     // /api/workers ✅
app.use("/api", agoraRoutes);    // /api/agora-token ✅

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("✅ Server running on", PORT);
});
