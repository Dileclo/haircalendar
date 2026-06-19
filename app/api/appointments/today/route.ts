import { NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    const rows = queryAll(
      `SELECT a.*, c.name as customer_name_linked
       FROM appointments a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE date(a.start_time) = ?
       ORDER BY a.start_time`,
      [today]
    );

    const totalRevenue = rows.reduce((sum: number, r: any) => sum + (r.price || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        count: rows.length,
        revenue: totalRevenue,
        appointments: rows,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
