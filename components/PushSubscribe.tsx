'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array(rawData.length).map((_, i) => rawData.charCodeAt(i));
}

export function PushSubscribe() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok = 'serviceWorker' in navigator && 'PushManager' in window &&
      window.isSecureContext;
    setSupported(ok);
    if (!ok) return;

    // Check existing subscription
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      if (Notification.permission === 'denied') setDenied(true);
    });
  }, []);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidPublic = 'BLRrJ4FSNIG7-xcaIclT-pV_N71ggallGoH0P7uCyQmiqJpvVbVejEtGUSieufWyulQwQLBnOvRCL85DevTS-b4';

      if (subscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setSubscribed(false);
      } else {
        // Subscribe
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setDenied(true);
          setLoading(false);
          return;
        }
        setDenied(false);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        });
        const raw = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: raw.endpoint,
            keys: raw.keys,
          }),
        });
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Push subscribe error:', err);
    }
    setLoading(false);
  }, [subscribed]);

  if (!supported) return null;

  return (
    <div style={{
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-secondary)' }}>
        🔔 Уведомления за час до записи
        {denied && <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>🚫 Запрещены</span>}
      </span>
      <button
        onClick={toggle}
        disabled={loading || denied}
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          border: 'none',
          background: subscribed ? '#34C759' : 'rgba(120,120,128,0.2)',
          position: 'relative',
          cursor: denied ? 'not-allowed' : 'pointer',
          opacity: denied ? 0.5 : 1,
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: subscribed ? 23 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}
