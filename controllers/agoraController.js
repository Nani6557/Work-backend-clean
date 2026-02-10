
import crypto from "crypto";
import agoraToken from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = agoraToken;

export function generateToken(req, res) {
  try {
    const channelName = req.query.channel || "default";
    const uid = req.query.uid
      ? parseInt(req.query.uid)
      : Math.floor(Math.random() * 100000);

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      process.env.AGORA_APP_ID,
      process.env.AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    res.json({ token, uid });
  } catch (err) {
    console.error("Agora token error:", err);
    res.status(500).json({ error: "Failed to generate Agora token" });
  }
}
