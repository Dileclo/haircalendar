'use client';

import { addMutation } from './offlineQueue';
import { saveOfflineAppointment } from './offlineData';

/**
 * Wrapper for API calls that queues mutations when offline.
 * Returns the same shape as the API: { success, data, error? }
 *
 * GET: always goes through to the SW (which can serve cached responses offline)
 * POST/PUT/DELETE online: goes through normally
 * POST/PUT/DELETE offline: queued in IndexedDB for later sync
 */
export async function apiCall(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<{ success: boolean; data?: any; error?: string; _offline?: boolean }> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  // For GET: always try the fetch — SW will serve from cache if offline
  if (method === 'GET') {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch {
      return { success: false, error: 'Нет соединения с сетью' };
    }
  }

  // For mutations when online — normal fetch
  if (isOnline) {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json();
    } catch {
      // Network failed even though we thought we were online → queue
      return await queueMutation(method, url, body);
    }
  }

  // Offline mutation — queue for later
  return await queueMutation(method, url, body);
}

async function queueMutation(
  method: string,
  url: string,
  body?: any
): Promise<{ success: boolean; data?: any; error?: string; _offline?: boolean }> {
  try {
    await addMutation(method, url, body);

    // For appointment creation, also save locally so it appears in the UI immediately
    if (url === '/api/appointments' && method === 'POST' && body) {
      const offlineRecord = await saveOfflineAppointment({
        ...body,
        id: undefined, // no real ID yet
        status: body.status || 'scheduled',
      });
      return {
        success: true,
        data: offlineRecord,
        _offline: true,
      };
    }

    return { success: true, data: body, _offline: true };
  } catch {
    return { success: false, error: 'Не удалось сохранить оффлайн' };
  }
}
