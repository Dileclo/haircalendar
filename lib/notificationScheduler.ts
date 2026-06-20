import { getDb, queryAll, execute } from './db';
import { sendPushNotification } from './pushSender';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startNotificationScheduler() {
  if (intervalId) return;
  console.log('[Notifications] Scheduler started');

  const check = async () => {
    try {
      const db = await getDb();

      // Appointments starting in 55-65 minutes, not yet notified
      const rows = queryAll(
        `SELECT a.id, a.customer_name, a.service, a.start_time, a.price,
                ps.endpoint, ps.p256dh, ps.auth, ps.id as sub_id
         FROM appointments a
         CROSS JOIN push_subscriptions ps
         WHERE a.status = 'scheduled'
         AND a.notified = 0
         AND REPLACE(a.start_time, 'T', ' ') BETWEEN datetime('now', 'localtime', '+45 minutes')
                                                  AND datetime('now', 'localtime', '+75 minutes')`
      );

      console.log(`[Scheduler] Found ${rows.length} notification(s) to send`);
      if (rows.length === 0) return;

      // Group by appointment to avoid duplicate notifications
      const byAppt = new Map<number, any>();
      for (const row of rows) {
        if (!byAppt.has(row.id)) {
          byAppt.set(row.id, {
            id: row.id,
            customer_name: row.customer_name,
            service: row.service,
            start_time: row.start_time,
            price: row.price,
            subscriptions: [] as any[],
          });
        }
        byAppt.get(row.id)!.subscriptions.push({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
          sub_id: row.sub_id,
        });
      }

      // Send notifications
      for (const [, appt] of byAppt) {
        const title = `🔔 ${appt.customer_name}`;
        const time = appt.start_time?.substring(11, 16) || '';
        const body = `${appt.service} · ${appt.price?.toLocaleString()} ₽ · ${time}`;

        for (const sub of appt.subscriptions) {
          console.log(`[Scheduler] Sending push to ${appt.customer_name}: ${title}`);
          const ok = await sendPushNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            title,
            body,
            '/calendar'
          );
          console.log(`[Scheduler] Push result: ${ok ? 'OK' : 'FAILED'}`);
          if (!ok) {
            execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.sub_id]);
          }
        }

        console.log(`[Scheduler] Marking appointment ${appt.id} as notified`);
        execute('UPDATE appointments SET notified = 1 WHERE id = ?', [appt.id]);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  };

  // Run every 60 seconds
  intervalId = setInterval(check, 60_000);
  // Also run once immediately
  check();
}

export function stopNotificationScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
