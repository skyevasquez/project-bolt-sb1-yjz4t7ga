import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  addToOfflineQueue
} from '../lib/offlineDb';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const queue = await getOfflineQueue();
      setPendingCount(queue.length);

      for (const item of queue) {
        try {
          const { error } = await supabase.from(item.table).insert(item.data);

          if (!error) {
            await removeFromOfflineQueue(item.id);
            setPendingCount((prev) => Math.max(0, prev - 1));
          }
        } catch {
          console.error('Failed to sync item:', item.id);
        }
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  useEffect(() => {
    const loadPendingCount = async () => {
      const queue = await getOfflineQueue();
      setPendingCount(queue.length);
    };
    loadPendingCount();
  }, []);

  const submitWithOfflineSupport = useCallback(
    async <T extends Record<string, unknown>>(
      table: string,
      data: T
    ): Promise<{ success: boolean; offline: boolean }> => {
      if (isOnline) {
        try {
          const { error } = await supabase.from(table).insert(data);
          if (error) throw error;
          return { success: true, offline: false };
        } catch {
          await addToOfflineQueue(table, data);
          setPendingCount((prev) => prev + 1);
          return { success: true, offline: true };
        }
      } else {
        await addToOfflineQueue(table, data);
        setPendingCount((prev) => prev + 1);
        return { success: true, offline: true };
      }
    },
    [isOnline]
  );

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncQueue,
    submitWithOfflineSupport
  };
}
