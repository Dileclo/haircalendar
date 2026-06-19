import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryAll, execute } from '@/lib/db';
import { formatPhone } from '@/lib/phone';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all'; // all | active | dormant

  try {
    const db = await getDb();

    let baseSql = `SELECT c.*,
      (SELECT COUNT(*) FROM appointments WHERE customer_id = c.id) as visit_count,
      (SELECT COALESCE(SUM(price), 0) FROM appointments WHERE customer_id = c.id) as total_spent,
      (SELECT MAX(start_time) FROM appointments WHERE customer_id = c.id) as last_visit
     FROM customers c`;

    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push('(c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (filter === 'active') {
      // Visited in last 3 months
      conditions.push(`c.id IN (
        SELECT DISTINCT customer_id FROM appointments
        WHERE customer_id IS NOT NULL
        AND start_time >= date('now', 'localtime', '-3 months')
      )`);
    } else if (filter === 'new') {
      // First visit this month
      const monthStart = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
      conditions.push(`c.id IN (
        SELECT DISTINCT customer_id FROM appointments
        WHERE customer_id IS NOT NULL AND start_time >= ?
      )`);
      conditions.push(`c.id NOT IN (
        SELECT DISTINCT customer_id FROM appointments
        WHERE customer_id IS NOT NULL AND start_time < ?
      )`);
      params.push(monthStart, monthStart);
    } else if (filter === 'dormant') {
      // No visits in the last 3 months
      conditions.push(`c.id NOT IN (
        SELECT DISTINCT customer_id FROM appointments
        WHERE customer_id IS NOT NULL
        AND start_time >= date('now', 'localtime', '-3 months')
      )`);
      conditions.push(`c.id IN (
        SELECT DISTINCT customer_id FROM appointments WHERE customer_id IS NOT NULL
      )`);
    }

    let sql = baseSql;
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY c.name';

    const rows = queryAll(sql, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const result = execute(
      'INSERT INTO customers (name, phone, status) VALUES (?, ?, ?)',
      [body.name || '', formatPhone(body.phone || ''), body.status || 'post']
    );

    const customer = queryAll('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid])[0];

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
