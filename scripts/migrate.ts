import { getDb, saveDb } from '../lib/db';
import { deserialize } from 'bson';
import fs from 'fs';
import path from 'path';

const BSON_DIR = path.join(process.cwd(), '..', 'hairsalon');

// Extract hair id links from history (already deserialized from BSON as array of objects)
function getHistoryHairIds(history: any): number[] {
  if (!history || !Array.isArray(history)) return [];
  return history
    .filter((entry: any) => entry && entry.id)
    .map((entry: any) => Number(entry.id));
}

function readBsonFile(filename: string): any[] {
  const filepath = path.join(BSON_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return [];
  }
  const buffer = fs.readFileSync(filepath);
  const docs: any[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    // BSON document size is in first 4 bytes (little-endian int32)
    const size = buffer.readInt32LE(offset);
    if (size <= 0 || offset + size > buffer.length) break;

    const docBuffer = buffer.subarray(offset, offset + size);
    const doc = deserialize(docBuffer);
    docs.push(doc);
    offset += size;
  }

  return docs;
}

async function migrate() {
  console.log('Starting migration...\n');

  const db = await getDb();

  // Clear existing data
  db.run('DELETE FROM sales');
  db.run('DELETE FROM expenses');
  db.run('DELETE FROM appointments');
  db.run('DELETE FROM customers');

  // ============ CUSTOMERS ============
  console.log('Reading customer.bson...');
  const customersBson = readBsonFile('customer.bson');
  console.log(`Found ${customersBson.length} customers`);

  // Build lookup: legacy_hair_id -> customer_id
  const hairToCustomer = new Map<number, number>();

  let customerCount = 0;
  for (const c of customersBson) {
    const legacyId = c._id?.toString() || '';
    const name = String(c.name || '');
    const phone = String(c.tel || '');
    const status = String(c.status || 'post');

    db.run(
      'INSERT OR IGNORE INTO customers (legacy_id, name, phone, status) VALUES (?, ?, ?, ?)',
      [legacyId, name, phone, status]
    );

    // Get the inserted id
    const result = db.exec('SELECT last_insert_rowid()');
    const customerId = result[0]?.values[0]?.[0] as number;

    if (customerId) {
      // Parse history to build hair_id -> customer_id mapping
      const historyIds = getHistoryHairIds(c.history);
      for (const hid of historyIds) {
        hairToCustomer.set(hid, customerId);
      }
      customerCount++;
    }
  }
  console.log(`Imported ${customerCount} customers`);
  console.log(`Built ${hairToCustomer.size} history links`);

  // ============ APPOINTMENTS ============
  console.log('\nReading hair.bson...');
  const hairBson = readBsonFile('hair.bson');
  console.log(`Found ${hairBson.length} appointments`);

  let apptCount = 0;
  let linkedCount = 0;

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO appointments
     (legacy_id, legacy_hair_id, customer_id, customer_name, phone, service, price, start_time, end_time, color, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const h of hairBson) {
    const legacyId = h._id?.toString() || '';
    const legacyHairId = Number(h.id) || 0;
    const customerName = String(h.title || '');
    const phone = String(h.tel || '');
    const service = String(h.work || '');
    const price = parseInt(String(h.price || '0')) || 0;
    const startTime = String(h.start || '');
    const endTime = String(h.end || '');
    const color = String(h.color || '');
    const description = String(h.description || '');

    const customerId = hairToCustomer.get(legacyHairId) || null;
    if (customerId) linkedCount++;

    insertStmt.bind([
      legacyId,
      legacyHairId,
      customerId,
      customerName,
      phone,
      service,
      price,
      startTime,
      endTime,
      color,
      description,
      'completed'
    ]);
    insertStmt.step();
    insertStmt.reset();
    apptCount++;
  }
  insertStmt.free();
  console.log(`Imported ${apptCount} appointments`);
  console.log(`Linked ${linkedCount} to customers`);

  // ============ EXPENSES ============
  console.log('\nReading rashod.bson...');
  const rashodBson = readBsonFile('rashod.bson');
  console.log(`Found ${rashodBson.length} expenses`);

  let expCount = 0;
  for (const r of rashodBson) {
    const legacyId = r._id?.toString() || '';
    const name = String(r.name || '');
    const amount = parseInt(String(r.price || '0')) || 0;
    const date = String(r.date || '');
    const receipt = String(r.pas || '');

    db.run(
      'INSERT OR IGNORE INTO expenses (legacy_id, name, amount, date, receipt) VALUES (?, ?, ?, ?, ?)',
      [legacyId, name, amount, date, receipt]
    );
    expCount++;
  }
  console.log(`Imported ${expCount} expenses`);

  // ============ SALES ============
  console.log('\nReading sale.bson...');
  const saleBson = readBsonFile('sale.bson');
  console.log(`Found ${saleBson.length} sales`);

  let saleCount = 0;
  for (const s of saleBson) {
    const legacyId = s._id?.toString() || '';
    const product = String(s.name || '');
    const amount = parseInt(String(s.price || '0')) || 0;
    const date = String(s.date || '');
    const receipt = String(s.pas || '');

    db.run(
      'INSERT OR IGNORE INTO sales (legacy_id, product, amount, date, receipt) VALUES (?, ?, ?, ?, ?)',
      [legacyId, product, amount, date, receipt]
    );
    saleCount++;
  }
  console.log(`Imported ${saleCount} sales`);

  // ============ SAVE ============
  saveDb();
  console.log('\nDatabase saved to hail.db');

  // ============ SUMMARY ============
  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Customers:    ${customerCount}`);
  console.log(`Appointments: ${apptCount} (${linkedCount} linked to customers)`);
  console.log(`Expenses:     ${expCount}`);
  console.log(`Sales:        ${saleCount}`);

  // Show some stats
  const totalRevenue = db.exec('SELECT SUM(price) as total FROM appointments');
  const totalExpenses = db.exec('SELECT SUM(amount) as total FROM expenses');
  const totalSales = db.exec('SELECT SUM(amount) as total FROM sales');

  console.log(`\nTotal Revenue:   ${totalRevenue[0]?.values[0]?.[0] || 0} ₽`);
  console.log(`Total Expenses:  ${totalExpenses[0]?.values[0]?.[0] || 0} ₽`);
  console.log(`Total Sales:     ${totalSales[0]?.values[0]?.[0] || 0} ₽`);

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
