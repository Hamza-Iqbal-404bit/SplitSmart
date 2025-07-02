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
  console.log('Received request:', req.method, req.body);
  if (req.method === 'POST') {
    const { email, otp } = req.body;

    if (otp) {
      // Verify OTP
      const record = otpStore[email];
      if (!record) {
        console.log('No OTP sent to this email:', email);
        return res.status(400).json({ success: false, error: 'No OTP sent to this email' });
      }
      if (Date.now() > record.expires) {
        delete otpStore[email];
        console.log('OTP expired for:', email);
        return res.status(400).json({ success: false, error: 'OTP expired' });
      }
      if (record.otp === otp) {
        delete otpStore[email];
        console.log('OTP verified for:', email);
        return res.json({ success: true });
      } else {
        console.log('Invalid OTP for:', email);
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
          subject: 'Your SplitSmart Verification Code',
          text: `Your verification code is: ${generatedOtp}`,
          html: `
            <div style="background:#f6f6fa;padding:40px 0;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(80,0,120,0.08);padding:32px 28px 24px 28px;">
                <h2 style="color:#5e35b1;text-align:center;margin-bottom:8px;">SplitSmart</h2>
                <p style="font-size:18px;color:#222;text-align:center;margin:0 0 18px 0;">Hi there,</p>
                <p style="font-size:16px;color:#444;text-align:center;margin:0 0 24px 0;">Your verification code is:</p>
                <div style="text-align:center;margin-bottom:24px;">
                  <span id="otp-code" style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:bold;color:#5e35b1;background:#ede7f6;padding:12px 32px;border-radius:12px;">${generatedOtp}</span>
                </div>
                <p style="font-size:15px;color:#666;text-align:center;margin-bottom:0;">Enter this code in the SplitSmart app to verify your email address.<br/>This code will expire in 5 minutes.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px 0;"/>
                <div style="text-align:center;font-size:13px;color:#aaa;">&copy; ${new Date().getFullYear()} SplitSmart. All rights reserved.</div>
              </div>
            </div>
          `,
        });
        console.log('OTP sent to:', email, 'OTP:', generatedOtp);
        return res.json({ success: true });
      } catch (err) {
        console.error('Failed to send OTP email:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      console.log('Email required but not provided');
      return res.status(400).json({ success: false, error: 'Email required' });
    }
  } else {
    console.log('Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
  }
} 