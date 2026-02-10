import crypto from "crypto";
import agora from "../config/agora.js";

export function generateToken(channelName, uid = 0, expireSeconds = 3600) {

  if (!agora.appId || !agora.appCertificate) {
    throw new Error("Agora App ID or App Certificate missing");
  }

  const appId = agora.appId;
  const appCertificate = agora.appCertificate;

  const expirationTime = Math.floor(Date.now() / 1000) + expireSeconds;

  const stringToSign = `${appId}${channelName}${uid}${expirationTime}`;
  const signature = crypto
    .createHmac("sha256", appCertificate)
    .update(stringToSign)
    .digest("hex");

  const token = `${appId}:${signature}:${expirationTime}`;

  return token;
}
