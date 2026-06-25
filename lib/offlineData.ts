'use client';

const DB_NAME = 'hail-offline-data';
const DB_VERSION = 3;

// ── IndexedDB helpers ──
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Store for full client list
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' });
      }
      // Store for service list
      if (!db.objectStoreNames.contains('services')) {
        db.createObjectStore('services', { keyPath: 'service' });
      }
      // Store for offline-created records (appointments created while offline)
      if (!db.objectStoreNames.contains('offline_appointments')) {
        db.createObjectStore('offline_appointments', { keyPath: '_offlineId' });
      }
      // Store for any cached API response (generic key-value)
      if (!db.objectStoreNames.contains('api_cache')) {
        db.createObjectStore('api_cache', { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Generic store helpers ──
async function storePut(store: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const obj = tx.objectStore(store);
    obj.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function storeGetAll(store: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const obj = tx.objectStore(store);
    const req = obj.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function storeGet(store: string, key: any): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const obj = tx.objectStore(store);
    const req = obj.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function storeDelete(store: string, key: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const obj = tx.objectStore(store);
    obj.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public API ──

/** Cache full client list locally */
export async function cacheClients(clients: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clients', 'readwrite');
    const store = tx.objectStore('clients');
    store.clear(); // Replace all
    for (const c of clients) store.put(c);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    // Also update api_cache
  });
}

/** Cache service list locally */
export async function cacheServices(services: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('services', 'readwrite');
    const store = tx.objectStore('services');
    store.clear();
    for (const s of services) store.put(s);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Search clients from local cache */
export async function searchLocalClients(query: string): Promise<any[]> {
  const all = await storeGetAll('clients');
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter((c: any) =>
    c.name?.toLowerCase().includes(q) ||
    c.phone?.toLowerCase().includes(q)
  );
}

/** Get all services from local cache */
export async function getLocalServices(): Promise<any[]> {
  return storeGetAll('services');
}

/** Search services from local cache */
export async function searchLocalServices(query: string): Promise<any[]> {
  const all = await storeGetAll('services');
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter((s: any) => s.service?.toLowerCase().includes(q));
}

/** Cache an API response for offline use */
export async function cacheApiResponse(url: string, data: any): Promise<void> {
  await storePut('api_cache', { url, data, timestamp: Date.now() });
}

/** Get cached API response */
export async function getCachedApiResponse(url: string): Promise<any | null> {
  const entry = await storeGet('api_cache', url);
  if (!entry) return null;
  // Expire after 7 days
  if (Date.now() - entry.timestamp > 7 * 86400000) {
    await storeDelete('api_cache', url);
    return null;
  }
  return entry.data;
}

// ── Offline appointments ──

let _offlineCounter = 0;

/** Save an appointment created while offline (will be synced later) */
export async function saveOfflineAppointment(appt: any): Promise<any> {
  const offlineId = `offline_${Date.now()}_${++_offlineCounter}`;
  const record = { ...appt, _offlineId: offlineId, _offline: true, _pendingSync: true };
  await storePut('offline_appointments', record);
  return record;
}

/** Get all offline-created appointments */
export async function getOfflineAppointments(): Promise<any[]> {
  return storeGetAll('offline_appointments');
}

/** Remove an offline appointment after successful sync */
export async function removeOfflineAppointment(offlineId: string): Promise<void> {
  await storeDelete('offline_appointments', offlineId);
}

/** Clear all offline data */
export async function clearOfflineData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['clients', 'services', 'offline_appointments', 'api_cache'], 'readwrite');
    tx.objectStore('clients').clear();
    tx.objectStore('services').clear();
    tx.objectStore('offline_appointments').clear();
    tx.objectStore('api_cache').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Check if we have local data available (for offline use) */
export async function hasLocalData(): Promise<boolean> {
  try {
    const clients = await storeGetAll('clients');
    return clients.length > 0;
  } catch {
    return false;
  }
}

// ── Hydration: fetch and cache all data needed for offline ──

/** Pull full client & service lists from server and cache locally.
 *  Call this periodically when online. */
export async function hydrateOfflineData(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  try {
    // Fetch all clients
    const clientsRes = await fetch('/api/customers');
    const clientsData = await clientsRes.json();
    if (clientsData.success) {
      await cacheClients(clientsData.data);
    }

    // Fetch service stats (for autocomplete)
    const svcRes = await fetch('/api/statistics/services');
    const svcData = await svcRes.json();
    if (svcData.success) {
      await cacheServices(svcData.data);
    }
  } catch {
    // Silently fail — will retry next time
  }
}
