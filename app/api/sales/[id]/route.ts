import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, execute } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDb();
    const body = await request.json();

    execute(
      'UPDATE sales SET product=?, amount=?, date=?, receipt=? WHERE id=?',
      [body.product || '', parseInt(body.amount) || 0, body.date || '', body.receipt || '', id]
    );

    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: sale });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDb();
    execute('DELETE FROM sales WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
