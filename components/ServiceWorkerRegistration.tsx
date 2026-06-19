'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Only register SW on HTTPS or localhost (SW requires secure context)
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
    if (!isSecure) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
