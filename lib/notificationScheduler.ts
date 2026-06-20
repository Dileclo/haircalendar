import { queryAll, execute } from './db';
import { sendPushNotification } from './pushSender';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startNotificationScheduler() {
  if (intervalId) return;
  console.log('[Notifications] Scheduler started');

  const check = async () => {
    try {
      // Read DB fresh from disk each time to avoid stale cache
      const dbPath = path.join(process.cwd(), 'hail.db');
      if (!fs.existsSync(dbPath)) return;

      const buffer = fs.readFileSync(dbPath);
      const SQL = await initSqlJs();
      const db = new SQL.Database(buffer);

      const rows = queryAllRaw(db,
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
      if (rows.length === 0) { db.close(); return; }

      // Group by appointment
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
        const time = appt.start_time?.substring(11, 16) || '';
        const title = `🔔 ${appt.customer_name}`;
        const body = `${appt.service} · ${appt.price?.toLocaleString()} ₽ · ${time}`;

        for (const sub of appt.subscriptions) {
          console.log(`[Scheduler] Sending push to ${appt.customer_name}`);
          const ok = await sendPushNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            title, body, '/calendar'
          );
          console.log(`[Scheduler] Push result: ${ok ? 'OK' : 'FAILED'}`);
          if (!ok) {
            db.run('DELETE FROM push_subscriptions WHERE id = ?', [sub.sub_id]);
          }
        }

        // Mark as notified in the main DB (use the execute helper)
        console.log(`[Scheduler] Marking appointment ${appt.id} as notified`);
        db.run('UPDATE appointments SET notified = 1 WHERE id = ?', [appt.id]);
      }

      // Save changes back to disk
      const data = db.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
      db.close();
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  };

  intervalId = setInterval(check, 60_000);
  check();
}

function queryAllRaw(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function stopNotificationScheduler() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}
