import express from 'express';
import { query } from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get available menu items for the tenant's active vendor
router.get('/menu-items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Find active vendor first
    const activeVendorRes = await query(
      'SELECT id FROM vendors WHERE tenant_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1',
      [req.user.tenant_id]
    );
    const activeVendorId = activeVendorRes.rows[0]?.id;
    if (!activeVendorId) {
      return res.json([]);
    }

    const result = await query(
      'SELECT * FROM menu_items WHERE tenant_id = $1 AND vendor_id = $2 AND is_available = TRUE',
      [req.user.tenant_id, activeVendorId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's order for the user
router.get('/orders/today', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
  `SELECT o.*, m.name as menu_item_name, o.menu_item_id
   FROM orders o 
   JOIN menu_items m ON o.menu_item_id = m.id
   WHERE o.user_id = $1 AND o.order_date = $2`,
  [req.user.id, today]
);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order history for the user (dates prior to today)
router.get('/orders/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT o.*, m.name as menu_item_name, m.description as menu_item_description, v.name as vendor_name 
       FROM orders o 
       JOIN menu_items m ON o.menu_item_id = m.id
       LEFT JOIN vendors v ON o.vendor_id = v.id
       WHERE o.user_id = $1 AND o.order_date < $2
       ORDER BY o.order_date DESC`,
      [req.user.id, today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching past orders:', err);
    res.status(500).json({ message: 'Server error feedback' });
  }
});

// Get deadline
router.get('/deadline', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT cutoff_time FROM order_deadlines WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1', [req.user.tenant_id]);
    res.json(result.rows[0] || { cutoff_time: '09:30:00' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Notifications
router.get('/notifications', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, message as title, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving notifications' });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error marking notification read' });
  }
});

// Get current tenant's active status and settings (e.g. read-only checking)
router.get('/tenant/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, name, is_read_only, employee_limit FROM tenants WHERE id = $1',
      [req.user.tenant_id]
    );
    const settingsRes = await query(
      'SELECT support_email, support_phone FROM platform_settings WHERE id = $1',
      ['global']
    );
    const settings = settingsRes.rows[0] || { support_email: 'support@lunchos.com', support_phone: '+1 (555) 019-8234' };

    res.json({
      ...(result.rows[0] || { is_read_only: false }),
      support_email: settings.support_email,
      support_phone: settings.support_phone
    });
  } catch (err) {
    console.error('Error fetching tenant details:', err);
    res.status(500).json({ message: 'Server error retrieving status details.' });
  }
});

// Place an order
router.post('/orders', authMiddleware, async (req: AuthRequest, res) => {
  const { menuItemId } = req.body;
  if (!menuItemId) return res.status(400).json({ message: 'Menu item ID required' });

  try {
    // 1. Enforce order deadline (cutoff time) on the backend
  const deadlineRes = await query(
  'SELECT cutoff_time, opening_time FROM order_deadlines WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1',
  [req.user.tenant_id]
);
const deadline = deadlineRes.rows[0];
if (deadline) {
  const now = new Date();

  const [openH, openM] = (deadline.opening_time || '13:00').split(':');
  const openingTime = new Date();
  openingTime.setHours(parseInt(openH, 10), parseInt(openM, 10), 0, 0);

  const [cutH, cutM] = deadline.cutoff_time.split(':');
  const cutoff = new Date();
  cutoff.setHours(parseInt(cutH, 10), parseInt(cutM, 10), 0, 0);

  if (now < openingTime) {
    return res.status(400).json({ message: `Ordering has not opened yet. Orders open at ${deadline.opening_time?.slice(0, 5) || '13:00'}.` });
  }

  if (now > cutoff) {
    return res.status(400).json({ message: 'Ordering has closed for today.' });
  }
}

    const today = new Date().toISOString().split('T')[0];
    const itemId = menuItemId;
    
    // Check if item exists and matches tenant
    const itemRes = await query('SELECT * FROM menu_items WHERE id = $1 AND tenant_id = $2', [itemId, req.user.tenant_id]);
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    // Upsert order
    const orderId = `${req.user.id}-${today}`;
    await query(
      `INSERT INTO orders (id, tenant_id, user_id, vendor_id, menu_item_id, quantity, total_price, order_date, ordered_by_user_id)
       VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $3)
       ON CONFLICT (id) DO UPDATE SET menu_item_id = $5, total_price = $6`,
      [orderId, req.user.tenant_id, req.user.id, item.vendor_id, itemId, item.price, today]
    );

    res.json({ message: 'Order placed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel today's order
router.delete('/orders/today', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const deadlineRes = await query(
      'SELECT cutoff_time FROM order_deadlines WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1',
      [req.user.tenant_id]
    );
    const deadline = deadlineRes.rows[0];
    if (deadline) {
      const now = new Date();
      const [cutH, cutM] = deadline.cutoff_time.split(':');
      const cutoff = new Date();
      cutoff.setHours(parseInt(cutH), parseInt(cutM), 0, 0);
      if (now > cutoff) {
        return res.status(400).json({ message: 'Cannot cancel after ordering has closed.' });
      }
    }

    const orderId = `${req.user.id}-${today}`;
    await query('DELETE FROM orders WHERE id = $1 AND tenant_id = $2', [orderId, req.user.tenant_id]);
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active vendor for HOD/Employee

// Get active vendor for HOD/Employee
router.get('/active-vendor', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, name FROM vendors WHERE tenant_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1',
      [req.user.tenant_id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get team members (for HODs/Admins - filtered by department for HODs)
router.get('/team', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'hod' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    let result;
    if (req.user.role === 'hod') {
      result = await query(
        'SELECT id, name, email, role, department_id, is_active FROM users WHERE tenant_id = $1 AND department_id = $2 ORDER BY name ASC',
        [req.user.tenant_id, req.user.department_id]
      );
    } else {
      result = await query(
  'SELECT id, name, email, role, department_id, is_active FROM users WHERE tenant_id = $1 AND role != $2 ORDER BY name ASC',
  [req.user.tenant_id, 'vendor']
);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get department orders for HOD
router.get('/hod/orders', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'hod' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    let result;
    if (req.user.role === 'hod') {
      result = await query(
        `SELECT o.*, u.name as user_name, d.name as department_name, m.name as menu_item_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         JOIN menu_items m ON o.menu_item_id = m.id
         WHERE o.tenant_id = $1 AND o.order_date = $2 AND u.department_id = $3`,
        [req.user.tenant_id, today, req.user.department_id]
      );
    } else {
      result = await query(
        `SELECT o.*, u.name as user_name, d.name as department_name, m.name as menu_item_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         JOIN menu_items m ON o.menu_item_id = m.id
         WHERE o.tenant_id = $1 AND o.order_date = $2`,
        [req.user.tenant_id, today]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk order
router.post('/orders/bulk', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'hod' && req.user.role !== 'admin') {
     return res.status(403).json({ message: 'Forbidden' });
  }

  const { orders } = req.body; // Array of { userId, menuItemId }
  if (!Array.isArray(orders)) return res.status(400).json({ message: 'Orders array required' });

  try {
    // Enforce order deadline (cutoff time) on the backend for bulk orders too
    const deadlineRes = await query(
  'SELECT cutoff_time, opening_time FROM order_deadlines WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1',
  [req.user.tenant_id]
);
const deadline = deadlineRes.rows[0];
if (deadline) {
  const now = new Date();

  const [openH, openM] = (deadline.opening_time || '13:00').split(':');
  const openingTime = new Date();
  openingTime.setHours(parseInt(openH, 10), parseInt(openM, 10), 0, 0);

  const [cutH, cutM] = deadline.cutoff_time.split(':');
  const cutoff = new Date();
  cutoff.setHours(parseInt(cutH, 10), parseInt(cutM, 10), 0, 0);

  if (now < openingTime) {
    return res.status(400).json({ message: `Ordering has not opened yet. Orders open at ${deadline.opening_time?.slice(0, 5) || '13:00'}.` });
  }

  if (now > cutoff) {
    return res.status(400).json({ message: 'Ordering has closed for today.' });
  }
}

    const today = new Date().toISOString().split('T')[0];
    
    for (const order of orders) {
      // If HOD, verify the user belongs to their department
      if (req.user.role === 'hod') {
        const userCheck = await query('SELECT department_id FROM users WHERE id = $1 AND tenant_id = $2', [order.userId, req.user.tenant_id]);
        if (!userCheck.rows[0] || userCheck.rows[0].department_id !== req.user.department_id) {
          // Skip order if not in the same department
          continue;
        }
      }

      const itemRes = await query('SELECT * FROM menu_items WHERE id = $1 AND tenant_id = $2', [order.menuItemId, req.user.tenant_id]);
      const item = itemRes.rows[0];
      if (!item) continue;

      const orderId = `${order.userId}-${today}`;
      await query(
        `INSERT INTO orders (id, tenant_id, user_id, vendor_id, menu_item_id, quantity, total_price, order_date, ordered_by_user_id)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET menu_item_id = $5, total_price = $6`,
        [orderId, req.user.tenant_id, order.userId, item.vendor_id, order.menuItemId, item.price, today, req.user.id]
      );
    }
    res.json({ message: 'Bulk orders processed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a user (Admin only)
router.post('/users', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const { name, email, phone, role, department_id } = req.body;

  try {
    // 1. Check employee limit
    const tenantRes = await query('SELECT employee_limit FROM tenants WHERE id = $1', [req.user.tenant_id]);
    const limit = tenantRes.rows[0].employee_limit;

    const countRes = await query('SELECT count(*) FROM users WHERE tenant_id = $1', [req.user.tenant_id]);
    const currentCount = parseInt(countRes.rows[0].count);

    if (currentCount >= limit) {
      return res.status(400).json({ 
        message: `Employee limit reached (${limit}). Please upgrade your plan to add more users.` 
      });
    }

    // 2. Create user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, tenant_id, name, email, phone, role, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, req.user.tenant_id, name, email, phone || null, role || 'employee', department_id || null]
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email or phone already in use' });
    }
    console.error(err);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// HOD can add employees to their own department
router.post('/hod/employees', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'hod') return res.status(403).json({ message: 'HOD access only' });

  const { name, email, phone, role } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

  // HOD can only assign employee or intern roles
  const allowedRoles = ['employee', 'intern'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'HODs can only add employees or interns' });
  }

  try {
    // Check employee limit
    const tenantRes = await query('SELECT employee_limit FROM tenants WHERE id = $1', [req.user.tenant_id]);
    const limit = tenantRes.rows[0].employee_limit;
    const countRes = await query('SELECT count(*) FROM users WHERE tenant_id = $1', [req.user.tenant_id]);
    const currentCount = parseInt(countRes.rows[0].count);

    if (currentCount >= limit) {
      return res.status(400).json({ message: `Employee limit reached (${limit}). Please contact your admin to upgrade.` });
    }

    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, tenant_id, name, email, phone, role, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, req.user.tenant_id, name, email, phone || null, role || 'employee', req.user.department_id]
    );

    res.status(201).json({ message: 'Employee added successfully' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email or phone already in use' });
    }
    console.error(err);
    res.status(500).json({ message: 'Error adding employee' });
  }
});

router.delete('/users/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  
  try {
    // Check if trying to delete self
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

router.patch('/users/:id/toggle-status', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot suspend your own admin account' });
    }

    await query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'User status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user status' });
  }
});

router.put('/users/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  
  const { name, email, phone, role, department_id } = req.body;
  try {
    await query(
      'UPDATE users SET name = $1, email = $2, phone = $3, role = $4, department_id = $5 WHERE id = $6 AND tenant_id = $7',
      [name, email, phone || null, role, department_id || null, req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'User updated' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email or phone already in use' });
    }
    res.status(500).json({ message: 'Error updating user' });
  }
});

export default router;
