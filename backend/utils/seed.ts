import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedDemoData() {
  const tenants = await query('SELECT count(*) FROM tenants');
  if (parseInt(tenants.rows[0].count) > 0) return;

  console.log('Seeding demo data...');

  const tenantId = uuidv4();
  await query('INSERT INTO tenants (id, name, subscription_plan, employee_limit) VALUES ($1, $2, $3, $4)', [
    tenantId,
    'Demo Corp',
    'premium',
    100
  ]);

  const dept1Id = uuidv4();
  await query('INSERT INTO departments (id, tenant_id, name) VALUES ($1, $2, $3)', [
    dept1Id,
    tenantId,
    'Engineering'
  ]);

  // Admin user
  await query(
    'INSERT INTO users (id, tenant_id, name, email, role, department_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [uuidv4(), tenantId, 'Admin User', 'admin@example.com', 'admin', dept1Id]
  );

  // Employee (HOD)
  await query(
    'INSERT INTO users (id, tenant_id, name, email, phone, role, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [uuidv4(), tenantId, 'John Doe', 'john@example.com', '1234567890', 'hod', dept1Id]
  );

  // Vendors
  const vendor1Id = uuidv4();
  await query('INSERT INTO vendors (id, tenant_id, name, contact_info, is_active) VALUES ($1, $2, $3, $4, $5)', [
    vendor1Id,
    tenantId,
    'The Local Kitchen',
    'contact@localkitchen.com',
    true
  ]);

  const vendor2Id = uuidv4();
  await query('INSERT INTO vendors (id, tenant_id, name, contact_info, is_active) VALUES ($1, $2, $3, $4, $5)', [
    vendor2Id,
    tenantId,
    'Mamas Diner',
    'mama@diner.com',
    false
  ]);

  // Menu items for Kitchen
  await query(
    'INSERT INTO menu_items (id, tenant_id, vendor_id, name, description, price, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [uuidv4(), tenantId, vendor1Id, 'Jollof Rice', 'Spicy West African rice dish', 15.0, true]
  );
  await query(
    'INSERT INTO menu_items (id, tenant_id, vendor_id, name, description, price, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [uuidv4(), tenantId, vendor1Id, 'Fried Rice', 'Basmati rice with veggies', 12.0, true]
  );
  
  // Menu items for Diner
  await query(
    'INSERT INTO menu_items (id, tenant_id, vendor_id, name, description, price, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [uuidv4(), tenantId, vendor2Id, 'Beef Burger', 'Double patty juicy burger', 20.0, true]
  );

  // Default Deadline
  await query(
    'INSERT INTO order_deadlines (id, tenant_id, cutoff_time) VALUES ($1, $2, $3)',
    [tenantId + '-deadline', tenantId, '09:30:00']
  );

  console.log('Demo data seeded. You can login with: admin@example.com or john@example.com');
}
