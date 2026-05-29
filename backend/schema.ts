import { query } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

export async function initSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subscription_plan TEXT DEFAULT 'basic',
      employee_limit INTEGER DEFAULT 20,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      role TEXT CHECK (role IN ('admin', 'employee', 'hod', 'intern', 'vendor', 'super_admin')) NOT NULL,
      department_id TEXT REFERENCES departments(id),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      contact_info TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_suspended BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      vendor_id TEXT NOT NULL REFERENCES vendors(id),
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      vendor_id TEXT NOT NULL REFERENCES vendors(id),
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      quantity INTEGER DEFAULT 1,
      total_price DECIMAL(10, 2) NOT NULL,
      status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
      ordered_by_user_id TEXT REFERENCES users(id),
      order_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_deadlines (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      cutoff_time TIME NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS otps (
      identifier TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  try {
    await query(sql);

    // Migrations: add columns for existing databases
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS employee_limit INTEGER DEFAULT 20`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_send_summary BOOLEAN DEFAULT TRUE`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_reminders BOOLEAN DEFAULT TRUE`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN DEFAULT FALSE`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE`);
    await query(`UPDATE vendors SET is_suspended = FALSE WHERE is_suspended IS NULL`);
    await query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS on_system BOOLEAN DEFAULT TRUE`);
    await query(`UPDATE vendors SET on_system = TRUE WHERE on_system IS NULL`);

    // Redefine role check constraint to support super_admin
    try {
      await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
      await query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'employee', 'hod', 'intern', 'vendor', 'super_admin'))`);
    } catch (constraintErr) {
      console.log('Handled role check constraint alteration safely.');
    }

    // Seed system tenant for super admin
    await query(`
      INSERT INTO tenants (id, name, employee_limit, is_read_only)
      VALUES ('system-tenant', 'System Administration', 9999, FALSE)
      ON CONFLICT (id) DO NOTHING
    `);

    // Create and seed platform settings
    await query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id TEXT PRIMARY KEY,
        support_email TEXT NOT NULL DEFAULT 'support@lunchos.com',
        support_phone TEXT NOT NULL DEFAULT '+1 (555) 019-8234'
      )
    `);

    await query(`
      INSERT INTO platform_settings (id, support_email, support_phone)
      VALUES ('global', 'support@lunchos.com', '+1 (555) 019-8234')
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed super admin from environment variables — never overwrites once created
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Administrator';
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE || null;

    if (superAdminEmail) {
      await query(`
        INSERT INTO users (id, tenant_id, name, email, phone, role, is_active)
        VALUES ('super-admin-user', 'system-tenant', $1, $2, $3, 'super_admin', TRUE)
        ON CONFLICT (id) DO NOTHING
      `, [superAdminName, superAdminEmail, superAdminPhone]);
    }

    console.log('Schema initialized successfully');
  } catch (err) {
    console.error('Error initializing schema:', err);
  }
}