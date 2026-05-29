import { query } from './backend/db.js';
async function clean() {
  await query(`DELETE FROM orders WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp'))`);
  await query(`DELETE FROM menu_items WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp'))`);
  await query(`DELETE FROM users WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp'))`);
  await query(`DELETE FROM vendors WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp'))`);
  await query(`DELETE FROM departments WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp'))`);
  await query(`DELETE FROM order_deadlines WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp'))`);
  await query(`DELETE FROM tenants WHERE name IN ('Joeycorp', 'Democorp', 'Demo Corp')`);
  console.log("Cleanup done.");
  process.exit(0);
}
clean();
