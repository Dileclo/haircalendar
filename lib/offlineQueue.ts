'use client';

import { clearOfflineData } from './offlineData';

const DB_NAME = 'hail-offline';
const STORE = 'mutations';
const DB_VERSION = 1;

interface PendingMutation {
  id?: number;
  method: string;
  url: string;
  body: any;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addMutation(method: string, url: string, body: any): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add({ method, url, body, timestamp: Date.now() });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeMutation(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Replay all pending mutations.
 * After successful sync, clears offline data (clients cache + offline appointments)
 * and dispatches a custom event so pages can refresh.
 * Returns array of failed mutation IDs.
 */
export async function syncMutations(): Promise<number[]> {
  const mutations = await getPendingMutations();
  const failed: number[] = [];
  let synced = 0;

  for (const m of mutations) {
    try {
      const res = await fetch(m.url, {
        method: m.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m.body),
      });
      const data = await res.json();
      if (data.success) {
        await removeMutation(m.id!);
        synced++;
      } else {
        failed.push(m.id!);
      }
    } catch {
      failed.push(m.id!);
    }
  }

  // After successful sync, clear local offline data so it can be re-fetched fresh
  if (synced > 0) {
    try {
      await clearOfflineData();
    } catch {}
    // Notify all pages to refresh their data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
    }
  }

  return failed;
}
