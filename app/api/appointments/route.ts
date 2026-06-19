import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryAll, queryOne, execute } from '@/lib/db';
import { formatPhone } from '@/lib/phone';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const customer_id = searchParams.get('customer_id');
  const status = searchParams.get('status');

  try {
    const db = await getDb();

    let sql = `SELECT a.*, c.name as customer_name_linked FROM appointments a
               LEFT JOIN customers c ON a.customer_id = c.id WHERE 1=1`;
    const params: any[] = [];

    if (date) {
      sql += ` AND date(a.start_time) = ?`;
      params.push(date);
    }
    if (start) {
      sql += ` AND a.start_time >= ?`;
      params.push(start);
    }
    if (end) {
      sql += ` AND a.start_time <= ?`;
      params.push(end);
    }
    if (customer_id) {
      sql += ` AND a.customer_id = ?`;
      params.push(customer_id);
    }
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.start_time DESC LIMIT 500`;

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

    const startTime = body.start_time || '';
    const endTime = body.end_time || '';
    const excludeId = body.id || 0;

    // Check for time slot overlaps (only for scheduled appointments)
    if (startTime && endTime) {
      const overlap = queryOne(
        `SELECT COUNT(*) as cnt FROM appointments
         WHERE status != 'cancelled'
         AND id != ?
         AND start_time < ? AND end_time > ?
         AND date(start_time) = date(?)`,
        [excludeId, endTime, startTime, startTime]
      );

      if (overlap && overlap.cnt > 0) {
        return NextResponse.json(
          { success: false, error: 'Это время уже занято другой записью' },
          { status: 409 }
        );
      }
    }

    const result = execute(
      `INSERT INTO appointments (customer_id, customer_name, phone, service, price, start_time, end_time, color, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.customer_id || null,
        body.customer_name || '',
        formatPhone(body.phone || ''),
        body.service || '',
        parseInt(body.price) || 0,
        startTime,
        endTime,
        body.color || '',
        body.description || '',
        body.status || 'scheduled',
      ]
    );

    const appointment = queryAll('SELECT * FROM appointments WHERE id = ?', [result.lastInsertRowid])[0];

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
