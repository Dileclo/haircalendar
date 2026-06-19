'use client';

import { addMutation } from './offlineQueue';

/**
 * Wrapper for API calls that queues mutations when offline.
 * Returns the same shape as the API: { success, data, error? }
 */
export async function apiCall(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  // If online — normal fetch
  if (navigator.onLine) {
    try {
      const res = await fetch(url, {
        method,
        headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Ошибка соединения' };
    }
  }

  // Offline: GET can't work, mutations get queued
  if (method === 'GET') {
    return { success: false, error: 'Нет соединения с сетью' };
  }

  // Queue the mutation for later sync
  try {
    await addMutation(method, url, body);
    return { success: true, data: null, _offline: true } as any;
  } catch {
    return { success: false, error: 'Не удалось сохранить оффлайн' };
  }
}
