import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';

  try {
    const db = await getDb();

    let apptFormat: string;
    let expFormat: string;

    switch (period) {
      case 'day':
        apptFormat = `date(start_time)`;
        expFormat = `date`;
        break;
      case 'year':
        apptFormat = `strftime('%Y', start_time)`;
        expFormat = `strftime('%Y', date)`;
        break;
      default: // month
        apptFormat = `strftime('%Y-%m', start_time)`;
        expFormat = `strftime('%Y-%m', date)`;
    }

    const apptRevenue = queryAll(
      `SELECT ${apptFormat} as period, SUM(price) as value
       FROM appointments
       GROUP BY period`
    );

    const expData = queryAll(
      `SELECT ${expFormat} as period, SUM(amount) as value
       FROM expenses
       GROUP BY period`
    );

    const saleData = queryAll(
      `SELECT ${expFormat} as period, SUM(amount) as value
       FROM sales
       GROUP BY period`
    );

    return NextResponse.json({
      success: true,
      data: {
        revenue: apptRevenue,
        expenses: expData,
        sales: saleData,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
