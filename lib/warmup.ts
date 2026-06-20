// Pre-initialize database at server startup so the first request is fast
import { getDb } from './db';

let warmed = false;

export async function warmup() {
  if (warmed) return;
  try {
    console.log('[Warmup] Initializing database...');
    await getDb();
    warmed = true;
    console.log('[Warmup] Database ready');
  } catch (e) {
    console.error('[Warmup] Failed:', e);
  }
}
