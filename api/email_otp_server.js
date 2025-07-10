import nodemailer from 'nodemailer';

const otpStore = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Alternative Gmail configuration that often works better
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  },
  secure: false,
  requireTLS: true,
});

export default async function handler(req, res) {
  console.log('=== OTP SERVER REQUEST START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Environment check - SMTP_EMAIL:', process.env.SMTP_EMAIL ? 'SET' : 'NOT SET');
  console.log('Environment check - SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'SET' : 'NOT SET');
  
  // Check if SMTP is configured
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP credentials not configured');
    console.log('=== OTP SERVER REQUEST END - CONFIG ERROR ===');
    return res.status(500).json({ 
      success: false, 
      error: 'Email service not configured. Please contact administrator.' 
    });
  }

  if (req.method === 'POST') {
    const { email, otp } = req.body;

    if (otp) {
      console.log('🔍 OTP VERIFICATION REQUEST');
      console.log('Email:', email);
      console.log('OTP provided:', otp);
      console.log('Current OTP store:', JSON.stringify(otpStore, null, 2));
      
      // Verify OTP
      const record = otpStore[email];
      if (!record) {
        console.log('❌ No OTP sent to this email:', email);
        console.log('=== OTP SERVER REQUEST END - NO OTP FOUND ===');
        return res.status(400).json({ success: false, error: 'No OTP sent to this email' });
      }
      
      console.log('📅 OTP record found, checking expiry...');
      console.log('OTP record:', JSON.stringify(record, null, 2));
      console.log('Current time:', Date.now());
      console.log('Expiry time:', record.expires);
      console.log('Is expired:', Date.now() > record.expires);
      
      if (Date.now() > record.expires) {
        delete otpStore[email];
        console.log('❌ OTP expired for:', email);
        console.log('=== OTP SERVER REQUEST END - OTP EXPIRED ===');
        return res.status(400).json({ success: false, error: 'OTP expired' });
      }
      
      if (record.otp === otp) {
        delete otpStore[email];
        console.log('✅ OTP verified successfully for:', email);
        console.log('=== OTP SERVER REQUEST END - VERIFICATION SUCCESS ===');
        return res.json({ success: true });
      } else {
        console.log('❌ Invalid OTP for:', email);
        console.log('Expected OTP:', record.otp);
        console.log('Received OTP:', otp);
        console.log('=== OTP SERVER REQUEST END - INVALID OTP ===');
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
      }
    } else if (email) {
      console.log('📧 OTP SENDING REQUEST');
      console.log('Email:', email);
      console.log('Current OTP store before generation:', JSON.stringify(otpStore, null, 2));
      
      // Send OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = Date.now() + OTP_EXPIRY_MS;
      otpStore[email] = { otp: generatedOtp, expires: expiryTime };
      
      console.log('🔢 Generated OTP:', generatedOtp);
      console.log('⏰ Expiry time:', new Date(expiryTime).toISOString());
      console.log('📦 OTP store after generation:', JSON.stringify(otpStore, null, 2));
      
      try {
        console.log('📤 Attempting to send email...');
        console.log('SMTP configuration:', {
          service: 'gmail',
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD ? '***HIDDEN***' : 'NOT SET',
          tls: { rejectUnauthorized: false },
          secure: false,
          requireTLS: true
        });
        
        const mailResult = await transporter.sendMail({
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
        
        console.log('✅ Email sent successfully!');
        console.log('📧 Mail result:', JSON.stringify(mailResult, null, 2));
        console.log('📊 OTP sent to:', email, 'OTP:', generatedOtp);
        console.log('=== OTP SERVER REQUEST END - EMAIL SENT SUCCESS ===');
        return res.json({ success: true });
      } catch (err) {
        console.error('❌ Failed to send OTP email:', err);
        console.error('❌ Error details:', {
          message: err.message,
          code: err.code,
          response: err.response,
          command: err.command
        });
        console.log('=== OTP SERVER REQUEST END - EMAIL SEND FAILED ===');
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to send email. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    } else {
      console.log('❌ Email required but not provided');
      console.log('=== OTP SERVER REQUEST END - EMAIL MISSING ===');
      return res.status(400).json({ success: false, error: 'Email required' });
    }
  } else {
    console.log('❌ Method not allowed:', req.method);
    console.log('=== OTP SERVER REQUEST END - METHOD NOT ALLOWED ===');
    res.status(405).json({ error: 'Method not allowed' });
  }
} 