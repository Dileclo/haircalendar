import { NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const rows = queryAll(
      `SELECT c.id, c.name, c.phone,
        COUNT(a.id) as visits,
        COALESCE(SUM(a.price), 0) as total_spent,
        ROUND(COALESCE(AVG(a.price), 0)) as avg_price,
        MAX(a.start_time) as last_visit
       FROM customers c
       JOIN appointments a ON a.customer_id = c.id
       GROUP BY c.id
       HAVING total_spent > 0
       ORDER BY total_spent DESC
       LIMIT 15`
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
