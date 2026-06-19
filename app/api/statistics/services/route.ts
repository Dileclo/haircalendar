import { NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const rows = queryAll(
      `SELECT service, COUNT(*) as count, SUM(price) as revenue
       FROM appointments
       WHERE service != '' AND price > 0
       GROUP BY service
       ORDER BY count DESC
       LIMIT 15`
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
