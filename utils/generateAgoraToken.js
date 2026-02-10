const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

module.exports = function generateAgoraToken(channelName, uid) {
  const expiration = 3600; // 1 hour
  return RtcTokenBuilder.buildTokenWithUid(
    process.env.AGORA_APP_ID,
    process.env.AGORA_APP_CERT,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expiration
  );
};
