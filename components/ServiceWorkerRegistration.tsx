'use client';

import { useEffect, useRef } from 'react';

// Bump this version when SW has breaking changes that require a clean reset
const SW_VERSION = 2;

export function ServiceWorkerRegistration() {
  const registered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (registered.current) return;

    // Skip SW in dev mode — HMR/Turbopack conflicts cause reload loops
    if (process.env.NODE_ENV === 'development') {
      console.log('[SW] Dev mode — skipping');
      registered.current = true;
      return;
    }

    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      console.log('[SW] Not secure — skipping');
      registered.current = true;
      return;
    }

    const setupSW = async () => {
      try {
        const storedVersion = parseInt(localStorage.getItem('sw_version') || '0', 10);

        // If a different SW version was installed, nuke it before re-registering
        if (storedVersion !== SW_VERSION) {
          console.log(`[SW] Version change (${storedVersion} → ${SW_VERSION}) — resetting...`);
          const oldReg = await navigator.serviceWorker.getRegistration();
          if (oldReg) {
            await oldReg.unregister();
            console.log('[SW] Old SW unregistered');
          }
          // Clear old caches
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
            console.log('[SW] Cleared', keys.length, 'caches');
          }
          // Wait for browser to process unregistration
          await new Promise(r => setTimeout(r, 500));
        }

        // Check if already registered and active (same version)
        const existingReg = await navigator.serviceWorker.getRegistration();
        if (existingReg?.active) {
          console.log('[SW] Already active');
          localStorage.setItem('sw_version', String(SW_VERSION));
          registered.current = true;
          return;
        }

        // Register fresh
        console.log('[SW] Registering...');
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[SW] Registered:', reg.scope);
        localStorage.setItem('sw_version', String(SW_VERSION));

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version ready — refresh page');
            }
          });
        });

        registered.current = true;
      } catch (err) {
        console.warn('[SW] Failed:', err);
      }
    };

    setupSW();
  }, []);

  return null;
}
