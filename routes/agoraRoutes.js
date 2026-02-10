import express from "express";
import { generateToken } from "../controllers/agoraController.js";

const router = express.Router();

router.get("/agora-token", generateToken);

export default router;