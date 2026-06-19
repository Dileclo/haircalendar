import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryAll } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 });
    }

    execute(
      'INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)',
      [endpoint, keys.p256dh, keys.auth]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [body.endpoint || '']);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
