import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryAll, execute } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  try {
    const db = await getDb();

    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      sql += ' AND date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY date DESC';

    const rows = queryAll(sql, params);
    const total = rows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

    return NextResponse.json({ success: true, data: rows, total });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const result = execute(
      'INSERT INTO sales (product, amount, date, receipt) VALUES (?, ?, ?, ?)',
      [body.product || '', parseInt(body.amount) || 0, body.date || '', body.receipt || '']
    );

    const sale = queryAll('SELECT * FROM sales WHERE id = ?', [result.lastInsertRowid])[0];
    return NextResponse.json({ success: true, data: sale }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
