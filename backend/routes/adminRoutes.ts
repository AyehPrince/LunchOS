import express from 'express';
import { query } from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Middleware to ensure user is admin
const adminOnly = (req: AuthRequest, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

router.use(authMiddleware, adminOnly);

// Dashboard Stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tenantId = req.user.tenant_id;

    const employees = await query('SELECT count(*) FROM users WHERE tenant_id = $1', [tenantId]);
    const orders = await query('SELECT count(*), SUM(total_price) as total_cost FROM orders WHERE tenant_id = $1 AND order_date = $2', [tenantId, today]);
    const activeVendor = await query('SELECT id, name, contact_info, on_system FROM vendors WHERE tenant_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1', [tenantId]);
    const tenantRes = await query('SELECT employee_limit, subscription_plan, auto_send_summary, whatsapp_reminders FROM tenants WHERE id = $1', [tenantId]);
    const deadlineRes = await query('SELECT cutoff_time, opening_time FROM order_deadlines WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1', [tenantId]);
    // Insights: Orders by department
    const deptStats = await query(
      `SELECT d.name, count(o.id) as order_count
       FROM departments d
       LEFT JOIN users u ON d.id = u.department_id
       LEFT JOIN orders o ON u.id = o.user_id AND o.order_date = $2
       WHERE d.tenant_id = $1
       GROUP BY d.name
       ORDER BY order_count DESC`,
      [tenantId, today]
    );

    const tenant = tenantRes.rows[0] || {};

    res.json({
      totalEmployees: parseInt(employees.rows[0].count),
      employeeLimit: tenant.employee_limit || 20,
      subscription_plan: tenant.subscription_plan,
      auto_send_summary: tenant.auto_send_summary,
      whatsapp_reminders: tenant.whatsapp_reminders,
      ordersToday: parseInt(orders.rows[0].count),
      totalCost: parseFloat(orders.rows[0].total_cost || 0),
      activeVendor: activeVendor.rows[0] || null,
      cutoffTime: deadlineRes.rows[0]?.cutoff_time || '19:00:00',
      openingTime: deadlineRes.rows[0]?.opening_time || '13:00:00',
      departmentInsights: deptStats.rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Live Orders
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT o.*, u.name as user_name, d.name as department_name, m.name as menu_item_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       JOIN menu_items m ON o.menu_item_id = m.id
       WHERE o.tenant_id = $1 AND o.order_date = $2`,
      [req.user.tenant_id, today]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/orders/unordered', async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT u.id, u.name, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.tenant_id = $1 
       AND u.is_active = TRUE
       AND u.role != 'vendor'
       AND u.id NOT IN (
         SELECT user_id FROM orders WHERE order_date = $2 AND tenant_id = $1
       )`,
      [req.user.tenant_id, today]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Dispatch multi-channel reminders (Email, WhatsApp, SMS) to all active, unordered employees for today
router.post('/orders/remind', async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Find all active employees who have not ordered lunch yet for today
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.tenant_id = $1 
       AND u.is_active = TRUE
       AND u.role != 'vendor'
       AND u.id NOT IN (
         SELECT user_id FROM orders WHERE order_date = $2 AND tenant_id = $1
       )`,
      [req.user.tenant_id, today]
    );

    const unorderedUsers = result.rows;

    // Dispatch reminders via all channels concurrently using notificationService orchestration
    const processedReminders = await Promise.all(
      unorderedUsers.map(async (user: any) => {
        const messageText = `Hey ${user.name}, please remember to submit your lunch order for today!`;
        const delivery = await notificationService.dispatchMultiChannelBroadcast({
          name: user.name,
          email: user.email,
          phone: user.phone,
          messageText,
          subjectLine: 'Reminder: Select Your Lunch Menu Today'
        });

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          ...delivery
        };
      })
    );

    res.json({
      message: 'Reminders successfully sent across all active channels to unordered employees.',
      sentCount: unorderedUsers.length,
      details: processedReminders
    });
  } catch (err) {
    console.error('Error dispatching quick reminders:', err);
    res.status(500).json({ message: 'Server error occurred while dispatching reminders.' });
  }
});

// Buzz a single specific employee who hasn't submitted their lunch choice yet
router.post('/orders/buzz', async (req: AuthRequest, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required to buzz.' });
  }
  try {
    const userResult = await query(
      `SELECT id, name, email, phone FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [userId, req.user.tenant_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or inactive.' });
    }

    const user = userResult.rows[0];
    const messageText = `Hey ${user.name}, this is a gentle reminder to select and submit your lunch order for today!`;

    // Dispatch custom message to the buzzed users via active channels (Email, WhatsApp, SMS)
    const delivery = await notificationService.dispatchMultiChannelBroadcast({
      name: user.name,
      email: user.email,
      phone: user.phone,
      messageText,
      subjectLine: 'Urgent Reminder: Choose Your Lunch Meal'
    });

    res.json({
      success: true,
      message: `Buzzed ${user.name} successfully via all available channels.`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        ...delivery
      }
    });
  } catch (err) {
    console.error('Error in buzzing user:', err);
    res.status(500).json({ message: 'Server error occurred while buzzing.' });
  }
});

// Order Breakdown (Summary for Vendor)
router.get('/orders/summary', async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT m.name, count(*) as quantity
       FROM orders o
       JOIN menu_items m ON o.menu_item_id = m.id
       WHERE o.tenant_id = $1 AND o.order_date = $2
       GROUP BY m.name`,
      [req.user.tenant_id, today]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Deadline Management
router.get('/deadline', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM order_deadlines WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1', [req.user.tenant_id]);
    res.json(result.rows[0] || { cutoff_time: '19:00:00', opening_time: '13:00:00' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/deadline', async (req: AuthRequest, res) => {
  const { cutoff_time, opening_time } = req.body;
  try {
    const id = req.user.tenant_id + '-deadline';
    await query(
      `INSERT INTO order_deadlines (id, tenant_id, cutoff_time, opening_time) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id) DO UPDATE SET cutoff_time = $3, opening_time = $4`,
      [id, req.user.tenant_id, cutoff_time, opening_time || '13:00:00']
    );
    res.json({ message: 'Deadline updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Settings management
router.patch('/settings', async (req: AuthRequest, res) => {
  const { auto_send_summary, whatsapp_reminders } = req.body;
  try {
    await query(
      'UPDATE tenants SET auto_send_summary = $1, whatsapp_reminders = $2 WHERE id = $3',
      [auto_send_summary, whatsapp_reminders, req.user.tenant_id]
    );
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor Management
router.get('/vendors', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM vendors WHERE tenant_id = $1 ORDER BY created_at ASC', [req.user.tenant_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/vendors', async (req: AuthRequest, res) => {
  const { name, contact_info, on_system } = req.body;
  const id = uuidv4();
  try {
    // Check if there are any vendors for this tenant
    const existingVendors = await query('SELECT count(*) FROM vendors WHERE tenant_id = $1', [req.user.tenant_id]);
    const count = parseInt(existingVendors.rows[0].count);
    // If it is the first vendor, make it active. Otherwise, make it inactive by default.
    const is_active = count === 0;

    // Default to true if not defined
    const onSystemVal = on_system === undefined || on_system === null ? true : (String(on_system) === 'true' || on_system === true);

    await query(
      'INSERT INTO vendors (id, tenant_id, name, contact_info, is_active, on_system) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, req.user.tenant_id, name, contact_info, is_active, onSystemVal]
    );
    res.status(201).json({ id, message: 'Vendor added' });
  } catch (err) {
    console.error('Error adding vendor:', err);
    res.status(500).json({ message: 'Server error adding vendor' });
  }
});

router.patch('/vendors/:id/activate', async (req: AuthRequest, res) => {
  const vendorId = req.params.id;
  try {
    const isSuspendedRes = await query('SELECT is_suspended FROM vendors WHERE id = $1 AND tenant_id = $2', [vendorId, req.user.tenant_id]);
    if (isSuspendedRes.rows[0]?.is_suspended) {
      return res.status(400).json({ message: 'Cannot activate a suspended vendor' });
    }

    // Deactivate all others for this tenant
    await query('UPDATE vendors SET is_active = FALSE WHERE tenant_id = $1', [req.user.tenant_id]);
    // Activate selected
    await query('UPDATE vendors SET is_active = TRUE WHERE id = $1 AND tenant_id = $2', [vendorId, req.user.tenant_id]);
    res.json({ message: 'Vendor activated' });
  } catch (err) {
    console.error('Error activating vendor:', err);
    res.status(500).json({ message: 'Server error activating vendor' });
  }
});

router.put('/vendors/:id', async (req: AuthRequest, res) => {
  const { name, contact_info, on_system } = req.body;
  try {
    const onSystemVal = on_system === undefined || on_system === null ? true : (String(on_system) === 'true' || on_system === true);
    await query(
      'UPDATE vendors SET name = $1, contact_info = $2, on_system = $3 WHERE id = $4 AND tenant_id = $5',
      [name, contact_info, onSystemVal, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Vendor updated' });
  } catch (err) {
    console.error('Error updating vendor:', err);
    res.status(500).json({ message: 'Server error updating vendor' });
  }
});

router.delete('/vendors/:id', async (req: AuthRequest, res) => {
  try {
    const vendorId = req.params.id;
    const tenantId = req.user.tenant_id;

    // Get if the vendor is currently active
    const activeCheck = await query('SELECT is_active FROM vendors WHERE id = $1 AND tenant_id = $2', [vendorId, tenantId]);
    const wasActive = activeCheck.rows[0]?.is_active;

    await query('DELETE FROM orders WHERE vendor_id = $1 AND tenant_id = $2', [vendorId, tenantId]);
    await query('DELETE FROM menu_items WHERE vendor_id = $1 AND tenant_id = $2', [vendorId, tenantId]);
    await query('DELETE FROM vendors WHERE id = $1 AND tenant_id = $2', [vendorId, tenantId]);

    // If we deleted the active vendor, automatically make another available non-suspended vendor active (if any)
    if (wasActive) {
      const remaining = await query(
        'SELECT id FROM vendors WHERE tenant_id = $1 AND is_suspended = FALSE ORDER BY created_at ASC LIMIT 1',
        [tenantId]
      );
      if (remaining.rows[0]) {
        await query('UPDATE vendors SET is_active = TRUE WHERE id = $1', [remaining.rows[0].id]);
      }
    }

    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    console.error('Error deleting vendor:', err);
    res.status(500).json({ message: 'Server error deleting vendor' });
  }
});

router.patch('/vendors/:id/toggle-suspend', async (req: AuthRequest, res) => {
  try {
    const vendorId = req.params.id;
    const tenantId = req.user.tenant_id;

    // Toggle is_suspended status
    const currentStatusRes = await query(
      'SELECT is_suspended, is_active FROM vendors WHERE id = $1 AND tenant_id = $2',
      [vendorId, tenantId]
    );
    if (currentStatusRes.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const newSuspended = !currentStatusRes.rows[0].is_suspended;
    const wasActive = currentStatusRes.rows[0].is_active;

    // If we are suspending a vendor who is currently active, deactivate them first
    if (newSuspended && wasActive) {
      await query('UPDATE vendors SET is_active = FALSE WHERE id = $1 AND tenant_id = $2', [vendorId, tenantId]);
      
      // Try to assign active status to another non-suspended vendor
      const remaining = await query(
         'SELECT id FROM vendors WHERE tenant_id = $1 AND id != $2 AND is_suspended = FALSE ORDER BY created_at ASC LIMIT 1',
         [tenantId, vendorId]
      );
      if (remaining.rows[0]) {
        await query('UPDATE vendors SET is_active = TRUE WHERE id = $1', [remaining.rows[0].id]);
      }
    }

    await query(
      'UPDATE vendors SET is_suspended = $1 WHERE id = $2 AND tenant_id = $3',
      [newSuspended, vendorId, tenantId]
    );

    res.json({ message: `Vendor ${newSuspended ? 'suspended' : 'unsuspended'}` });
  } catch (err) {
    console.error('Error toggling vendor suspension:', err);
    res.status(500).json({ message: 'Server error toggling vendor suspension' });
  }
});

// Menu Management
router.get('/vendors/:id/menu', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM menu_items WHERE vendor_id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/vendors/:id/menu', async (req: AuthRequest, res) => {
  const { name, description, price } = req.body;
  const itemId = uuidv4();
  const numericPrice = parseFloat(price) || 0;
  try {
    await query(
      'INSERT INTO menu_items (id, tenant_id, vendor_id, name, description, price) VALUES ($1, $2, $3, $4, $5, $6)',
      [itemId, req.user.tenant_id, req.params.id, name, description, numericPrice]
    );
    res.status(201).json({ message: 'Menu item added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/menu-items/:id', async (req: AuthRequest, res) => {
  const { name, description, price, is_available } = req.body;
  try {
    await query(
      'UPDATE menu_items SET name = $1, description = $2, price = $3, is_available = $4 WHERE id = $5 AND tenant_id = $6',
      [name, description, price, is_available, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Menu item updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/menu-items/:id', async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM menu_items WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/plan', async (req: AuthRequest, res) => {
  const { plan, limit } = req.body;
  try {
    await query(
      'UPDATE tenants SET subscription_plan = $1, employee_limit = $2 WHERE id = $3',
      [plan, limit, req.user.tenant_id]
    );
    res.json({ message: 'Plan updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, name, email, phone FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', async (req: AuthRequest, res) => {
  const { name, phone } = req.body;
  try {
    await query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Departments
router.get('/departments', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM departments WHERE tenant_id = $1', [req.user.tenant_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/departments', async (req: AuthRequest, res) => {
  const { name } = req.body;
  const id = uuidv4();
  try {
    await query('INSERT INTO departments (id, tenant_id, name) VALUES ($1, $2, $3)', [id, req.user.tenant_id, name]);
    res.json({ id, message: 'Department created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
