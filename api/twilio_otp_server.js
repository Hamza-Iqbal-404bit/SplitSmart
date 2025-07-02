import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

const otpStore = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { phone, otp } = req.body;

    if (otp) {
      // Verify OTP
      const record = otpStore[phone];
      if (!record) return res.status(400).json({ success: false, error: 'No OTP sent to this number' });
      if (Date.now() > record.expires) {
        delete otpStore[phone];
        return res.status(400).json({ success: false, error: 'OTP expired' });
      }
      if (record.otp === otp) {
        delete otpStore[phone];
        return res.json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
      }
    } else if (phone) {
      // Send OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[phone] = { otp: generatedOtp, expires: Date.now() + OTP_EXPIRY_MS };
      try {
        await client.messages.create({
          body: `Your verification code is: ${generatedOtp}`,
          from: twilioPhone,
          to: phone
        });
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 