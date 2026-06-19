import { NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').substring(0, 16);

    const rows = queryAll(
      `SELECT a.*, c.name as customer_name_linked
       FROM appointments a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.start_time >= ? AND a.start_time <= ? AND a.status != 'cancelled'
       ORDER BY a.start_time
       LIMIT 50`,
      [now, nextWeek]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
