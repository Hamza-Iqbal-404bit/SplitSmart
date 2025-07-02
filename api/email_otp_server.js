import nodemailer from 'nodemailer';

const otpStore = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Configure your SMTP transport (use your Gmail, Outlook, etc.)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, otp } = req.body;

    if (otp) {
      // Verify OTP
      const record = otpStore[email];
      if (!record) return res.status(400).json({ success: false, error: 'No OTP sent to this email' });
      if (Date.now() > record.expires) {
        delete otpStore[email];
        return res.status(400).json({ success: false, error: 'OTP expired' });
      }
      if (record.otp === otp) {
        delete otpStore[email];
        return res.json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
      }
    } else if (email) {
      // Send OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[email] = { otp: generatedOtp, expires: Date.now() + OTP_EXPIRY_MS };
      try {
        await transporter.sendMail({
          from: process.env.SMTP_EMAIL,
          to: email,
          subject: 'Your OTP Code',
          text: `Your verification code is: ${generatedOtp}`,
        });
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 