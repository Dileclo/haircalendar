'use client';

import { useEffect, useState } from 'react';

interface ToastData {
  message: string;
  type?: 'success' | 'error' | 'info';
}

let showToastFn: ((t: ToastData) => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  showToastFn?.({ message, type });
}

export function ToastProvider() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    showToastFn = setToast;
    return () => { showToastFn = null; };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  const colors: Record<string, string> = {
    success: '#34C759',
    error: '#FF3B30',
    info: '#007AFF',
  };

  return (
    <div
      className="toast"
      style={{ borderLeft: `4px solid ${colors[toast.type || 'info']}` }}
    >
      {toast.message}
    </div>
  );
}
