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
      'UPDATE expenses SET name=?, amount=?, date=?, receipt=?, category=? WHERE id=?',
      [body.name || '', parseInt(body.amount) || 0, body.date || '', body.receipt || '', body.category || '', id]
    );

    const expense = queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: expense });
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
    execute('DELETE FROM expenses WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
