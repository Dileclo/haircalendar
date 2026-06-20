import { NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';
import { sendPushNotification } from '@/lib/pushSender';

export async function GET() {
  try {
    const db = await getDb();
    const subs = queryAll('SELECT endpoint, p256dh, auth FROM push_subscriptions');
    if (subs.length === 0) {
      return NextResponse.json({ success: false, error: 'Нет подписок. Включите уведомления на сайте.' });
    }

    let count = 0;
    for (const sub of subs) {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        '🔔 Тестовое уведомление HairCalendar',
        'Уведомления работают! Вы получите такое же за час до записи.',
        '/calendar'
      );
      if (ok) count++;
    }

    return NextResponse.json({ success: true, sent: count, total: subs.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
