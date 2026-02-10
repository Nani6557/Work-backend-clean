import { sendOTP as sendTwilioOTP } from "../services/twilioService.js";
export async function sendOTP(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      await sendTwilioOTP(phone, `Your verification code is ${otp}`);
      return res.json({ success: true });
    } else {
      // dev fallback: return OTP in response
      return res.json({ success: true, otp });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
