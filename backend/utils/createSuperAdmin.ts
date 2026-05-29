import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

async function createSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const phone = process.env.SUPER_ADMIN_PHONE;

  if (!name || !email) {
    console.error('❌ SUPER_ADMIN_NAME and SUPER_ADMIN_EMAIL must be set in your .env file');
    process.exit(1);
  }

  try {
    // Check if super admin already exists
    const existing = await query(
      "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1"
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  A super admin already exists. Aborting.');
      process.exit(0);
    }

    // Create a system tenant for the super admin
    const systemTenantId = 'system-tenant';
    await query(
      `INSERT INTO tenants (id, name, subscription_plan, employee_limit)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [systemTenantId, 'LunchOS Platform', 'enterprise', 999999]
    );

    // Create the super admin user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, tenant_id, name, email, phone, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, systemTenantId, name, email, phone || null, 'super_admin']
    );

    console.log('✅ Super admin created successfully!');
    console.log(`   Name:  ${name}`);
    console.log(`   Email: ${email}`);
    if (phone) console.log(`   Phone: ${phone}`);
    console.log('\n👉 Login at http://localhost:3000 using your email or phone via OTP.');
    process.exit(0);
  } catch (err: any) {
    if (err.code === '23505') {
      console.error('❌ A user with that email or phone already exists.');
    } else {
      console.error('❌ Error creating super admin:', err.message);
    }
    process.exit(1);
  }
}

createSuperAdmin();