'use client';

import { useEffect, useRef } from 'react';

export function ServiceWorkerRegistration() {
  const registered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (registered.current) return;

    // Skip SW in dev mode — HMR/Turbopack conflicts cause reload loops
    if (process.env.NODE_ENV === 'development') {
      console.log('[SW] Skipping in dev mode (use npm run build + npm run start to test PWA)');
      registered.current = true;
      return;
    }

    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      console.log('[SW] Not a secure context — skipping');
      registered.current = true;
      return;
    }

    const setupSW = async () => {
      // First, nuke any old/stale SW to get a clean slate
      const existingReg = await navigator.serviceWorker.getRegistration();
      if (existingReg) {
        console.log('[SW] Unregistering old SW...');
        await existingReg.unregister();
        // Also clear all caches from old SW
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
          console.log('[SW] Cleared', keys.length, 'old caches');
        }
        // Small delay before re-registering
        await new Promise(r => setTimeout(r, 300));
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[SW] Registered, scope:', reg.scope);

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version ready — refresh to activate');
            }
          });
        });

        registered.current = true;
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };

    setupSW();
  }, []);

  return null;
}
