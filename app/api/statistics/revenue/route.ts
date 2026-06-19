import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month'; // day, week, month, year

  try {
    const db = await getDb();

    let format: string;
    switch (period) {
      case 'day':
        format = `date(start_time)`;
        break;
      case 'week':
        format = `strftime('%Y-W%W', start_time)`;
        break;
      case 'year':
        format = `strftime('%Y', start_time)`;
        break;
      default: // month
        format = `strftime('%Y-%m', start_time)`;
    }

    const rows = queryAll(
      `SELECT ${format} as period, COUNT(*) as count, SUM(price) as revenue
       FROM appointments
       GROUP BY period ORDER BY period`
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
