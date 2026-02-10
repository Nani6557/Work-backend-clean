
import client from "../config/twilio.js";

export async function sendOTP(phone, otp) {
  return client.messages.create({
    body: `Your login OTP is ${otp}`,
    from: process.env.TWILIO_FROM_PHONE,
    to: phone,
  });
}
