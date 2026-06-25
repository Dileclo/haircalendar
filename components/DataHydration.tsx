'use client';

import { useEffect, useRef } from 'react';
import { hydrateOfflineData } from '@/lib/offlineData';

export function DataHydration() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    const hydrate = async () => {
      if (!navigator.onLine) {
        console.log('[Hydrate] Offline — skipping');
        return;
      }
      attemptRef.current++;
      console.log(`[Hydrate] Attempt #${attemptRef.current} — fetching clients & services...`);
      try {
        await hydrateOfflineData();
        console.log('[Hydrate] Done — clients & services cached to IndexedDB');
      } catch (err) {
        console.warn('[Hydrate] Failed:', err);
        // Retry once after 3 seconds
        setTimeout(() => {
          if (navigator.onLine) {
            hydrateOfflineData().then(() => console.log('[Hydrate] Retry OK')).catch(() => {});
          }
        }, 3000);
      }
    };

    // Run on mount (slight delay to let the page settle)
    setTimeout(hydrate, 1000);

    // Run when coming online
    window.addEventListener('online', hydrate);

    // Run after offline mutations are synced
    window.addEventListener('offline-sync-complete', hydrate);

    // Periodic refresh every 15 min
    intervalRef.current = setInterval(hydrate, 15 * 60 * 1000);

    return () => {
      window.removeEventListener('online', hydrate);
      window.removeEventListener('offline-sync-complete', hydrate);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
