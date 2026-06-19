import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, queryAll, execute } from '@/lib/db';
import { formatPhone } from '@/lib/phone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDb();

    const customer = queryOne(
      `SELECT c.*,
        (SELECT COUNT(*) FROM appointments WHERE customer_id = c.id) as visit_count,
        (SELECT COALESCE(SUM(price), 0) FROM appointments WHERE customer_id = c.id) as total_spent,
        (SELECT MAX(start_time) FROM appointments WHERE customer_id = c.id) as last_visit
       FROM customers c WHERE c.id = ?`,
      [id]
    );

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const history = queryAll(
      'SELECT * FROM appointments WHERE customer_id = ? ORDER BY start_time DESC',
      [id]
    );

    return NextResponse.json({ success: true, data: { ...customer, history } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDb();
    const body = await request.json();

    execute(
      'UPDATE customers SET name = ?, phone = ?, status = ? WHERE id = ?',
      [body.name, formatPhone(body.phone), body.status, id]
    );

    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: customer });
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
    execute('DELETE FROM customers WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
