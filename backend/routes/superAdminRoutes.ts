import express, { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = express.Router();

// Middleware to enforce that the request is initiated strictly by a Super Admin
const superAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }
  next();
};

/**
 * GET /api/v1/super-admin/tenants
 * Retrieves a detailed report of all registered companies/institutions in the system
 * alongside active seat counts (users registered under each tenant)
 */
router.get('/tenants', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.name, t.subscription_plan, t.employee_limit, t.is_active, t.is_read_only, t.created_at,
              COALESCE(u.seat_count, 0)::INTEGER as seat_count,
              (SELECT email FROM users WHERE tenant_id = t.id AND role = 'admin' LIMIT 1) as contact_email,
              (SELECT phone FROM users WHERE tenant_id = t.id AND role = 'admin' LIMIT 1) as contact_phone
       FROM tenants t
       LEFT JOIN (
         SELECT tenant_id, COUNT(*) as seat_count 
         FROM users 
         GROUP BY tenant_id
       ) u ON t.id = u.tenant_id
       WHERE t.id != 'system-tenant'
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tenants for super admin:', err);
    res.status(500).json({ message: 'Failed to retrieve registered institutions.' });
  }
});

/**
 * PUT /api/v1/super-admin/tenants/:id/read-only
 * Configures the block/read-only flag on an institution (payment or management reasons)
 */
router.put('/tenants/:id/read-only', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { isReadOnly } = req.body;

  if (typeof isReadOnly !== 'boolean') {
    return res.status(400).json({ message: 'Missing or invalid isReadOnly state parameter.' });
  }

  try {
    const checkRes = await query('SELECT id, name FROM tenants WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Institution not found.' });
    }

    await query(
      'UPDATE tenants SET is_read_only = $1, updated_at = NOW() WHERE id = $2',
      [isReadOnly, id]
    );

    const actionText = isReadOnly ? 'TOGGLE_READ_ONLY_ON' : 'TOGGLE_READ_ONLY_OFF';
    const detailText = isReadOnly ? `Set tenant "${checkRes.rows[0].name}" to Read-Only Mode` : `Restored tenant "${checkRes.rows[0].name}" to Normal Mode`;
    await query(
      'INSERT INTO audit_logs (id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), req.user.id, actionText, detailText]
    );

    console.log(`[Super Admin Action] Toggled read-only mode to ${isReadOnly} for tenant ${checkRes.rows[0].name} (${id})`);

    res.json({
      success: true,
      message: `Institution "${checkRes.rows[0].name}" is now ${isReadOnly ? 'set to read-only' : 'restored to active text permission'} mode.`
    });
  } catch (err) {
    console.error('Error updating tenant read-only mode:', err);
    res.status(500).json({ message: 'Failed to complete read-only operation.' });
  }
});

/**
 * PUT /api/v1/super-admin/tenants/:id/limit
 * Updates allocation limits (maximum user accounts / seats count)
 */
router.put('/tenants/:id/limit', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { employeeLimit } = req.body;

  const limitNum = parseInt(employeeLimit, 10);
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ message: 'Please provide a valid employee ceiling limit (minimum 1).' });
  }

  try {
    const checkRes = await query('SELECT id, name FROM tenants WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Institution not found.' });
    }

    await query(
      'UPDATE tenants SET employee_limit = $1, updated_at = NOW() WHERE id = $2',
      [limitNum, id]
    );

    await query(
      'INSERT INTO audit_logs (id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), req.user.id, 'UPDATE_TENANT_LIMIT', `Updated employee limit for "${checkRes.rows[0].name}" to ${limitNum}`]
    );

    res.json({
      success: true,
      message: `Employee seat limit of "${checkRes.rows[0].name}" updated smoothly to ${limitNum}.`
    });
  } catch (err) {
    console.error('Error updating tenant seat limits:', err);
    res.status(500).json({ message: 'Failed to update workspace user accounts limit.' });
  }
});

/**
 * GET /api/v1/super-admin/stats
 * Synthesizes high-level usage metrics across the database for the administration screen
 */
router.get('/stats', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  try {
    const tenantsCount = await query('SELECT COUNT(*) as cnt FROM tenants WHERE id != \'system-tenant\'');
    const activeTenantsCount = await query('SELECT COUNT(*) as cnt FROM tenants WHERE is_active = TRUE AND id != \'system-tenant\'');
    const readOnlyCount = await query('SELECT COUNT(*) as cnt FROM tenants WHERE is_read_only = TRUE');
    const totalUsersCount = await query('SELECT COUNT(*) as cnt FROM users WHERE tenant_id != \'system-tenant\'');

    res.json({
      totalInstitutions: parseInt(tenantsCount.rows[0].cnt, 10),
      activeInstitutions: parseInt(activeTenantsCount.rows[0].cnt, 10),
      readOnlyInstitutions: parseInt(readOnlyCount.rows[0].cnt, 10),
      totalSeatsUsed: parseInt(totalUsersCount.rows[0].cnt, 10)
    });
  } catch (err) {
    console.error('Error compiling administration statistics:', err);
    res.status(500).json({ message: 'Could not fetch platform counters.' });
  }
});

/**
 * GET /api/v1/super-admin/settings
 * Retrieves global platform support configurations
 */
router.get('/settings', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT support_email, support_phone FROM platform_settings WHERE id = $1', ['global']);
    res.json(result.rows[0] || { support_email: 'support@lunchos.com', support_phone: '+1 (555) 019-8234' });
  } catch (err) {
    console.error('Error fetching platform settings:', err);
    res.status(500).json({ message: 'Failed to retrieve system settings.' });
  }
});

/**
 * PUT /api/v1/super-admin/settings
 * Updates global platform support configurations
 */
router.put('/settings', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  const { supportEmail, supportPhone } = req.body;

  if (!supportEmail || !supportPhone) {
    return res.status(400).json({ message: 'Support email and phone details are required.' });
  }

  // Basic validation checks
  if (!supportEmail.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid support email address.' });
  }

  try {
    await query(
      `INSERT INTO platform_settings (id, support_email, support_phone)
       VALUES ('global', $1, $2)
       ON CONFLICT (id) 
       DO UPDATE SET support_email = EXCLUDED.support_email, support_phone = EXCLUDED.support_phone`,
      [supportEmail.trim(), supportPhone.trim()]
    );

    await query(
      'INSERT INTO audit_logs (id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), req.user.id, 'UPDATE_PLATFORM_SETTINGS', `Updated global support contact info`]
    );

    res.json({
      success: true,
      message: 'Global workspace support configurations updated successfully.'
    });
  } catch (err) {
    console.error('Error updating platform settings:', err);
    res.status(500).json({ message: 'Failed to persist support settings.' });
  }
});

/**
 * GET /api/v1/super-admin/audit-logs
 * Retrieves audit logs for super admin actions
 */
router.get('/audit-logs', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.action, a.details, a.created_at, u.name as admin_name
       FROM audit_logs a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ message: 'Failed to fetch audit logs.' });
  }
});

/**
 * POST /api/v1/super-admin/tenants/:id/message
 * Sends a message/notification to a tenant's administrators
 */
router.post('/tenants/:id/message', authMiddleware, superAdminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'A message body is required.' });
  }

  try {
    const tenantRes = await query('SELECT name FROM tenants WHERE id = $1', [id]);
    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ message: 'Institution not found.' });
    }

    const tenantName = tenantRes.rows[0].name;

    // Get all admin users for this tenant
    const adminsRes = await query(
      "SELECT id, email, phone FROM users WHERE tenant_id = $1 AND role = 'admin'",
      [id]
    );

    if (adminsRes.rows.length === 0) {
      return res.status(400).json({ message: 'No registered administrators found for this institution.' });
    }

    // Insert notifications for each admin
    for (const admin of adminsRes.rows) {
      await query(
        'INSERT INTO notifications (id, user_id, message) VALUES ($1, $2, $3)',
        [crypto.randomUUID(), admin.id, `LunchOS: ${message}`]
      );
      console.log(`[Super Admin] Mock sending Email to ${admin.email}: ${message}`);
      if (admin.phone) {
        console.log(`[Super Admin] Mock sending SMS/WhatsApp to ${admin.phone}: ${message}`);
      }
    }

    await query(
      'INSERT INTO audit_logs (id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), req.user.id, 'SEND_TENANT_MESSAGE', `Sent message to administrators of "${tenantName}"`]
    );

    res.json({ success: true, message: `Message successfully sent to ${adminsRes.rows.length} administrators of ${tenantName}.` });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to dispatch message to institution.' });
  }
});

export default router;
