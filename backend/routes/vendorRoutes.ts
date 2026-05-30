import express from 'express';
import { query } from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Middleware to ensure only vendors can access these routes
function vendorOnly(req: AuthRequest, res: any, next: any) {
  if (req.user.role !== 'vendor') return res.status(403).json({ message: 'Vendor access only' });
  next();
}

// Get vendor profile + their vendor record
router.get('/profile', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    const userRes = await query('SELECT id, name, email, phone FROM users WHERE id = $1', [req.user.id]);
    const vendorRes = await query('SELECT id, name, contact_info, is_active, is_suspended FROM vendors WHERE tenant_id = $1 AND contact_info = $2 LIMIT 1',
      [req.user.tenant_id, userRes.rows[0]?.phone || userRes.rows[0]?.email]
    );
    res.json({ user: userRes.rows[0], vendor: vendorRes.rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor's own record by matching their user account to a vendor entry
router.get('/me', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    // Find vendor linked to this user's tenant — vendors are linked by tenant
    // A vendor user is tied to a vendor record via tenant_id and their user id stored in vendor table
    const vendorRes = await query(
      'SELECT * FROM vendors WHERE tenant_id = $1 AND id = $2',
      [req.user.tenant_id, req.user.id]
    );

    // Fallback: find any vendor in the tenant that matches the user's name
    if (vendorRes.rows.length === 0) {
      const fallback = await query(
        'SELECT * FROM vendors WHERE tenant_id = $1 LIMIT 1',
        [req.user.tenant_id]
      );
      return res.json(fallback.rows[0] || null);
    }

    res.json(vendorRes.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's orders for the vendor
router.get('/orders/today', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find the vendor record linked to this user
    const vendorRes = await query(
      `SELECT v.id FROM vendors v
       JOIN users u ON u.tenant_id = v.tenant_id
       WHERE u.id = $1 AND v.tenant_id = $2
       ORDER BY v.is_active DESC LIMIT 1`,
      [req.user.id, req.user.tenant_id]
    );

    const vendorId = vendorRes.rows[0]?.id;
    if (!vendorId) return res.json({ orders: [], summary: [], total: 0 });

    const ordersRes = await query(
      `SELECT o.id, o.status, o.quantity, o.total_price, o.created_at,
              u.name as employee_name, u.email as employee_email,
              d.name as department_name,
              m.name as meal_name, m.description as meal_description
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       JOIN menu_items m ON o.menu_item_id = m.id
       WHERE o.vendor_id = $1 AND o.order_date = $2
       ORDER BY o.created_at ASC`,
      [vendorId, today]
    );

    // Summary grouped by meal
    const summaryRes = await query(
      `SELECT m.name as meal_name, COUNT(o.id)::int as quantity, SUM(o.total_price)::float as total_price
       FROM orders o
       JOIN menu_items m ON o.menu_item_id = m.id
       WHERE o.vendor_id = $1 AND o.order_date = $2
       GROUP BY m.name
       ORDER BY quantity DESC`,
      [vendorId, today]
    );

    const totalRes = await query(
      `SELECT COUNT(id)::int as total FROM orders WHERE vendor_id = $1 AND order_date = $2`,
      [vendorId, today]
    );

    res.json({
      orders: ordersRes.rows,
      summary: summaryRes.rows,
      total: totalRes.rows[0]?.total || 0,
      vendorId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm all orders for today (batch confirm)
router.post('/orders/confirm-all', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const vendorRes = await query(
      `SELECT v.id FROM vendors v
       JOIN users u ON u.tenant_id = v.tenant_id
       WHERE u.id = $1 AND v.tenant_id = $2
       ORDER BY v.is_active DESC LIMIT 1`,
      [req.user.id, req.user.tenant_id]
    );

    const vendorId = vendorRes.rows[0]?.id;
    if (!vendorId) return res.status(404).json({ message: 'Vendor not found' });

    const result = await query(
      `UPDATE orders SET status = 'confirmed'
       WHERE vendor_id = $1 AND order_date = $2 AND status = 'pending'
       RETURNING id`,
      [vendorId, today]
    );

    res.json({ message: `${result.rows.length} orders confirmed`, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor's menu items
router.get('/menu', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    const vendorRes = await query(
      `SELECT v.id FROM vendors v
       JOIN users u ON u.tenant_id = v.tenant_id
       WHERE u.id = $1 AND v.tenant_id = $2
       ORDER BY v.is_active DESC LIMIT 1`,
      [req.user.id, req.user.tenant_id]
    );

    const vendorId = vendorRes.rows[0]?.id;
    if (!vendorId) return res.json([]);

    const result = await query(
      'SELECT * FROM menu_items WHERE vendor_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [vendorId, req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add menu item
router.post('/menu', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  const { name, description, price } = req.body;
  if (!name) return res.status(400).json({ message: 'Meal name required' });

  try {
    const vendorRes = await query(
      `SELECT v.id FROM vendors v
       JOIN users u ON u.tenant_id = v.tenant_id
       WHERE u.id = $1 AND v.tenant_id = $2
       ORDER BY v.is_active DESC LIMIT 1`,
      [req.user.id, req.user.tenant_id]
    );

    const vendorId = vendorRes.rows[0]?.id;
    if (!vendorId) return res.status(404).json({ message: 'Vendor not found' });

    const id = uuidv4();
    await query(
      'INSERT INTO menu_items (id, tenant_id, vendor_id, name, description, price) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, req.user.tenant_id, vendorId, name, description || null, price || 0]
    );
    res.status(201).json({ message: 'Menu item added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete menu item
router.delete('/menu/:id', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    await query(
      'DELETE FROM menu_items WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update menu item availability
router.patch('/menu/:id/toggle', authMiddleware, vendorOnly, async (req: AuthRequest, res) => {
  try {
    await query(
      'UPDATE menu_items SET is_available = NOT is_available WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Availability updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;