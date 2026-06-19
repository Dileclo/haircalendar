import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, execute } from '@/lib/db';
import { formatPhone } from '@/lib/phone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDb();
    const appt = queryOne('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appt) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: appt });
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

    const startTime = body.start_time || '';
    const endTime = body.end_time || '';

    // Check for time slot overlaps (exclude current appointment)
    if (startTime && endTime) {
      const overlap = queryOne(
        `SELECT COUNT(*) as cnt FROM appointments
         WHERE status != 'cancelled'
         AND id != ?
         AND start_time < ? AND end_time > ?
         AND date(start_time) = date(?)`,
        [id, endTime, startTime, startTime]
      );

      if (overlap && overlap.cnt > 0) {
        return NextResponse.json(
          { success: false, error: 'Это время уже занято другой записью' },
          { status: 409 }
        );
      }
    }

    execute(
      `UPDATE appointments SET customer_id=?, customer_name=?, phone=?, service=?, price=?,
       start_time=?, end_time=?, color=?, description=?, status=? WHERE id=?`,
      [
        body.customer_id || null,
        body.customer_name || '',
        formatPhone(body.phone || ''),
        body.service || '',
        parseInt(body.price) || 0,
        startTime,
        endTime,
        body.color || '',
        body.description || '',
        body.status || 'scheduled',
        id,
      ]
    );

    const appt = queryOne('SELECT * FROM appointments WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: appt });
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
    execute('DELETE FROM appointments WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
