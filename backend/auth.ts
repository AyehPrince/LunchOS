import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface AuthRequest extends Request {
  user?: any;
}

export const generateToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '14d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = verifyToken(token) as any;
    req.user = decoded;
    
    // Check if the tenant associated with the user is set to Read-Only mode.
    // Super Administrators are exempt from tenant-level read-only locks.
    if (decoded.tenant_id && decoded.role !== 'super_admin' && req.method !== 'GET') {
      try {
        const tenantRes = await query('SELECT is_read_only FROM tenants WHERE id = $1', [decoded.tenant_id]);
        if (tenantRes.rows.length > 0 && tenantRes.rows[0].is_read_only) {
          const settingsRes = await query('SELECT support_email, support_phone FROM platform_settings WHERE id = $1', ['global']);
          const settings = settingsRes.rows[0] || { support_email: 'support@lunchos.com', support_phone: '+1 (555) 019-8234' };

          return res.status(403).json({
            message: 'This Workspace is in Read-Only mode due to payment or management status. Please contact support.',
            isReadOnly: true,
            supportEmail: settings.support_email,
            supportPhone: settings.support_phone
          });
        }
      } catch (dbErr) {
        console.error('Error in auth read-only verification database check:', dbErr);
      }
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
