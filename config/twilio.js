import Twilio from "twilio";

let client = null;

if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
) {
  client = Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  console.log("✅ Twilio client initialized");
} else {
  console.warn("⚠️ Twilio credentials missing");
}

export async function sendOTP(phone, message) {
  if (!client) {
    throw new Error("Twilio is not configured");
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error("TWILIO_PHONE_NUMBER is missing");
  }

  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  console.log("✅ OTP SMS sent:", result.sid);

  return result;
}

export default client;
