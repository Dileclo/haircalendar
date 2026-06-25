'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount, syncMutations } from '@/lib/offlineQueue';

export function NetworkStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const swListenerRef = useRef(false);

  const updatePending = useCallback(() => {
    getPendingCount().then(setPending).catch(() => {});
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    updatePending();

    const goOnline = () => { setOnline(true); };
    const goOffline = () => { setOnline(false); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Listen for sync messages from service worker
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_MUTATIONS' || e.data?.type === 'SYNC_COMPLETE') {
        updatePending();
      }
    };
    if (!swListenerRef.current && navigator.serviceWorker) {
      swListenerRef.current = true;
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Auto-sync when coming back online
    const autoSync = async () => {
      if (!navigator.onLine) return;
      const count = await getPendingCount();
      if (count > 0) {
        setSyncing(true);
        await syncMutations();
        setSyncing(false);
        updatePending();
      }
    };
    autoSync();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (navigator.serviceWorker && swListenerRef.current) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        swListenerRef.current = false;
      }
    };
  }, [updatePending]);

  // Re-sync when coming online
  useEffect(() => {
    if (!online) return;
    (async () => {
      const count = await getPendingCount();
      if (count > 0) {
        setSyncing(true);
        await syncMutations();
        setSyncing(false);
        updatePending();
      }
    })();
  }, [online, updatePending]);

  const handleSync = async () => {
    setSyncing(true);
    await syncMutations();
    setSyncing(false);
    updatePending();
  };

  if (online && pending === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      {!online ? (
        <div style={{
          background: '#FF9500',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 16px',
          width: '100%',
        }}>
          📡 Нет сети — изменения сохранятся локально
        </div>
      ) : pending > 0 ? (
        <div style={{
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 16px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{pending} изменений ожидают синхронизации</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {syncing ? '...' : 'Синхр.'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
