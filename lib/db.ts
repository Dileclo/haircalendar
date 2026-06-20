import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

// Static path for Turbopack tracing compatibility
// @ts-ignore — static path for Turbopack traceability
const DB_PATH = path.join(process.cwd(), 'hail.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  try {
    console.log('[DB] Initializing sql.js...');
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        if (typeof window !== 'undefined') return `/${file}`;
        const candidates = [
          path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
          path.join(process.cwd(), 'public', file),
        ];
        for (const p of candidates) {
          try { if (fs.existsSync(p)) { console.log('[DB] WASM at', p); return p; } } catch {}
        }
        console.error('[DB] WASM not found at', candidates);
        return candidates[0];
      },
    });
    console.log('[DB] sql.js OK');

    if (fs.existsSync(DB_PATH)) {
      console.log('[DB] Opening', DB_PATH);
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      console.log('[DB] Creating new DB at', DB_PATH);
      db = new SQL.Database();
      createTables(db);
      saveDb();
    }
    console.log('[DB] Ready');
    return db;
  } catch(e) {
    console.error('[DB] CRASH:', e);
    throw e;
  }
}

function createTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legacy_id TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      status TEXT DEFAULT 'post',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legacy_id TEXT UNIQUE,
      legacy_hair_id INTEGER UNIQUE,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      service TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      start_time TEXT NOT NULL,
      end_time TEXT DEFAULT '',
      color TEXT DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'scheduled',
      notified INTEGER DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legacy_id TEXT UNIQUE,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      receipt TEXT DEFAULT '',
      category TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legacy_id TEXT UNIQUE,
      product TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      receipt TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes
  database.run(`CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_appointments_legacy ON appointments(legacy_hair_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);

  // Migrations for existing databases
  migrateSchema(database);
}

function migrateSchema(database: Database) {
  // Add `notified` column to appointments if missing
  try {
    database.run(`ALTER TABLE appointments ADD COLUMN notified INTEGER DEFAULT 0`);
  } catch {}
  // Add `status` column to appointments if missing (for very old DBs)
  try {
    database.run(`ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'scheduled'`);
  } catch {}
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run a query and return all rows as objects
export function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return first row
export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: execute a statement (INSERT, UPDATE, DELETE)
export function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  // Use exec to get last_insert_rowid + changes — sql.js exec returns
  // {columns: string[], values: any[][]}[] so we unwrap carefully.
  const meta = db.exec('SELECT last_insert_rowid() as id, changes() as cnt');
  const row = meta?.[0]?.values?.[0];
  const lastInsertRowid = row ? Number(row[0]) : 0;
  const changes = row ? Number(row[1]) : 0;
  saveDb();
  return { changes, lastInsertRowid };
}

// Helper: get row count for a table
export function count(table: string, where: string = '', params: any[] = []): number {
  let sql = `SELECT COUNT(*) as cnt FROM ${table}`;
  if (where) sql += ` WHERE ${where}`;
  const row = queryOne(sql, params);
  return row ? row.cnt : 0;
}
