'use client';

import { useEffect, useRef } from 'react';
import { hydrateOfflineData } from '@/lib/offlineData';

/**
 * Hydrates local IndexedDB cache with full client & service lists
 * so the app works fully offline. Runs on mount when online,
 * periodically every 15 minutes, and after offline sync completes.
 */
export function DataHydration() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initial hydration when online
    const hydrate = () => {
      if (navigator.onLine) {
        hydrateOfflineData().catch(() => {});
      }
    };

    // Run on mount
    hydrate();

    // Run when coming online
    window.addEventListener('online', hydrate);

    // Run after offline mutations are synced
    window.addEventListener('offline-sync-complete', hydrate);

    // Periodic refresh every 15 min while online
    intervalRef.current = setInterval(hydrate, 15 * 60 * 1000);

    return () => {
      window.removeEventListener('online', hydrate);
      window.removeEventListener('offline-sync-complete', hydrate);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null; // Invisible component
}
