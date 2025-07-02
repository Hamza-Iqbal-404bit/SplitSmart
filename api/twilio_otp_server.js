const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Use environment variables for credentials
// On Vercel: Set these in the Environment Variables UI
// For local dev: create a .env file in the project root and use dotenv (see comment below)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Uncomment for local dev:
// require('dotenv').config();
// Place .env in the project root with:
// TWILIO_ACCOUNT_SID=...
// TWILIO_AUTH_TOKEN=...
// TWILIO_PHONE_NUMBER=...

// In-memory OTP store (for demo; use a database for production)
const otpStore = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone] = { otp, expires: Date.now() + OTP_EXPIRY_MS };
  try {
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: twilioPhone,
      to: phone
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];
  if (!record) return res.json({ success: false, error: 'No OTP sent to this number' });
  if (Date.now() > record.expires) {
    delete otpStore[phone];
    return res.json({ success: false, error: 'OTP expired' });
  }
  if (record.otp === otp) {
    delete otpStore[phone];
    return res.json({ success: true });
  } else {
    return res.json({ success: false, error: 'Invalid OTP' });
  }
});

app.listen(3000, () => console.log('Twilio OTP server running on port 3000')); 