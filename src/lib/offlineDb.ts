const DB_NAME = 'ComplianceHubOffline';
const DB_VERSION = 1;

interface OfflineQueueItem {
  id: string;
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

let db: IDBDatabase | null = null;

export async function initOfflineDb(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains('offlineQueue')) {
        database.createObjectStore('offlineQueue', { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains('cachedData')) {
        const store = database.createObjectStore('cachedData', { keyPath: 'key' });
        store.createIndex('table', 'table', { unique: false });
      }
    };
  });
}

export async function addToOfflineQueue(
  table: string,
  data: Record<string, unknown>
): Promise<string> {
  const database = await initOfflineDb();
  const id = crypto.randomUUID();
  const item: OfflineQueueItem = {
    id,
    table,
    data,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('offlineQueue', 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    const request = store.add(item);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const database = await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('offlineQueue', 'readonly');
    const store = transaction.objectStore('offlineQueue');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const database = await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('offlineQueue', 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheData(
  key: string,
  table: string,
  data: unknown
): Promise<void> {
  const database = await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('cachedData', 'readwrite');
    const store = transaction.objectStore('cachedData');
    const request = store.put({ key, table, data, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('cachedData', 'readonly');
    const store = transaction.objectStore('cachedData');
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result?.data || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearCache(): Promise<void> {
  const database = await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cachedData', 'offlineQueue'], 'readwrite');
    transaction.objectStore('cachedData').clear();
    transaction.objectStore('offlineQueue').clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
