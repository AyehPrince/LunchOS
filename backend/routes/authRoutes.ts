import express from 'express';
import { query } from '../db.js';
import { generateToken } from '../auth.js';
import { addMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Institution Registration
router.post('/register', async (req, res) => {
  const { companyName, adminName, email, phone, employeeRange } = req.body;

  if (!companyName || !adminName || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Map ranges to limits
  const rangeMap: Record<string, number> = {
    '0-20': 20,
    '21-50': 50,
    '51-100': 100,
    '100+': 999999
  };

  const limit = rangeMap[employeeRange] || 20;

  try {
    const tenantId = uuidv4();
    const adminId = uuidv4();

    // Create Tenant
    await query(
      'INSERT INTO tenants (id, name, employee_limit) VALUES ($1, $2, $3)',
      [tenantId, companyName, limit]
    );

    // Create Admin User
    await query(
      'INSERT INTO users (id, tenant_id, name, email, phone, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [adminId, tenantId, adminName, email, phone, 'admin']
    );

    res.status(201).json({ message: 'Company registered successfully. You can now login.' });
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
       return res.status(400).json({ message: 'Email or company name already in use.' });
    }
    res.status(500).json({ message: 'Registration failed due to a server error.' });
  }
});

// Request OTP
router.post('/request-otp', async (req, res) => {
  const { identifier } = req.body; // email or phone
  if (!identifier) return res.status(400).json({ message: 'Identifier is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = addMinutes(new Date(), 10);

  try {
    await query(
      'INSERT INTO otps (identifier, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (identifier) DO UPDATE SET otp = $2, expires_at = $3',
      [identifier, otp, expires_at]
    );

    console.log(`[OTP DEBUG] OTP for ${identifier}: ${otp}`);
    
    // In production, send via SMS/Email
    const isEmail = identifier.includes('@');
    if (isEmail) {
      const subject = 'Your LunchOS Verification Code';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
          <h2 style="color: #2563eb; font-size: 20px; font-weight: 850; margin-bottom: 16px;">LunchOS Verification</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #374151;">
            You requested a verification code to access your LunchOS account.
          </p>
          <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 12px; font-size: 26px; font-weight: 800; text-align: center; letter-spacing: 4px; color: #1d4ed8;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
            This security code is active for 10 minutes. Please keep it confidential.
          </p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af;">
            For protection, do not share this code. Admin teams will never ask for your verification keys.
          </div>
        </div>
      `;
      await notificationService.sendEmail(identifier, subject, htmlContent);
    } else {
      const messageText = `Your LunchOS verification code is: ${otp}. Valid for 10 minutes.`;
      // Dispatch both SMS & WhatsApp depending on active credentials
      await Promise.allSettled([
        notificationService.sendSMS(identifier, messageText),
        notificationService.sendWhatsApp(identifier, messageText)
      ]);
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ message: 'Missing identifier or otp' });

  try {
    const result = await query('SELECT * FROM otps WHERE identifier = $1', [identifier]);
    const storedOtp = result.rows[0];

    if (!storedOtp || storedOtp.otp !== otp || new Date() > new Date(storedOtp.expires_at)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    await query('DELETE FROM otps WHERE identifier = $1', [identifier]);

    // Find user
    const userRes = await query('SELECT * FROM users WHERE email = $1 OR phone = $1', [identifier]);
    let user = userRes.rows[0];

    // If user doesn't exist, this might be a first-time login (depending on system logic)
    // For now, let's assume users must be pre-registered by admins as per the doc
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please contact your admin.' });
    }

    const token = generateToken({
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      name: user.name
    });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;
