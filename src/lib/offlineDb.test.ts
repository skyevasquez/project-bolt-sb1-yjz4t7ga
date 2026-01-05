import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  initOfflineDb,
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  cacheData,
  getCachedData,
  clearCache
} from './offlineDb';

describe('offlineDb', () => {
  beforeEach(async () => {
    try {
      await clearCache();
    } catch (e) {
      // If DB not init, fine.
    }
  });

  it('should initialize DB', async () => {
    const db = await initOfflineDb();
    expect(db).toBeDefined();
    expect(db.objectStoreNames.contains('offlineQueue')).toBe(true);
    expect(db.objectStoreNames.contains('cachedData')).toBe(true);
  });

  describe('Offline Queue', () => {
    it('should add item to offline queue', async () => {
      const id = await addToOfflineQueue('test_table', { foo: 'bar' });
      expect(id).toBeDefined();

      const queue = await getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(id);
      expect(queue[0].table).toBe('test_table');
      expect(queue[0].data).toEqual({ foo: 'bar' });
    });

    it('should remove item from offline queue', async () => {
      const id = await addToOfflineQueue('test_table', { foo: 'bar' });
      await removeFromOfflineQueue(id);

      const queue = await getOfflineQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('Cache', () => {
    it('should cache data and retrieve it', async () => {
      await cacheData('test_key', 'test_table', { data: 123 });
      const data = await getCachedData('test_key');
      expect(data).toEqual({ data: 123 });
    });

    it('should return null for non-existent cache key', async () => {
      const data = await getCachedData('non_existent');
      expect(data).toBeNull();
    });

    it('should update existing cache key', async () => {
      await cacheData('test_key', 'test_table', { v: 1 });
      await cacheData('test_key', 'test_table', { v: 2 });
      const data = await getCachedData('test_key');
      expect(data).toEqual({ v: 2 });
    });
  });

  describe('Clear Cache', () => {
    it('should clear all data', async () => {
      await addToOfflineQueue('t1', {});
      await cacheData('k1', 't1', {});

      await clearCache();

      const queue = await getOfflineQueue();
      const cache = await getCachedData('k1');

      expect(queue).toHaveLength(0);
      expect(cache).toBeNull();
    });
  });
});
