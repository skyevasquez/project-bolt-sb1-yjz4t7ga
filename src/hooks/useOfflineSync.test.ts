import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';
import { supabase } from '../lib/supabase';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as offlineDb from '../lib/offlineDb';
import * as useOnlineStatusHook from './useOnlineStatus';

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}));

vi.mock('../lib/offlineDb', async (importOriginal) => {
  const actual = await importOriginal<typeof offlineDb>();
  return {
    ...actual,
    addToOfflineQueue: vi.fn(),
    getOfflineQueue: vi.fn(),
    removeFromOfflineQueue: vi.fn(),
  };
});

vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default online
    (useOnlineStatusHook.useOnlineStatus as any).mockReturnValue(true);
    (offlineDb.getOfflineQueue as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should sync queue when online', async () => {
    const mockQueue = [
      { id: '1', table: 'test', data: { val: 1 }, timestamp: 123 },
    ];
    (offlineDb.getOfflineQueue as any).mockResolvedValue(mockQueue);
    (useOnlineStatusHook.useOnlineStatus as any).mockReturnValue(true);
    
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({ insert: insertMock });

    renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(offlineDb.getOfflineQueue).toHaveBeenCalled();
    });
    
    await waitFor(() => {
         expect(supabase.from).toHaveBeenCalledWith('test');
    });

    expect(insertMock).toHaveBeenCalledWith({ val: 1 });
    expect(offlineDb.removeFromOfflineQueue).toHaveBeenCalledWith('1');
  });

  it('should not sync when offline', async () => {
    (useOnlineStatusHook.useOnlineStatus as any).mockReturnValue(false);
    renderHook(() => useOfflineSync());
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should add to offline queue when submitting offline', async () => {
    (useOnlineStatusHook.useOnlineStatus as any).mockReturnValue(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.submitWithOfflineSupport('test', { foo: 'bar' });
    });

    expect(offlineDb.addToOfflineQueue).toHaveBeenCalledWith('test', { foo: 'bar' });
  });

  it('should add to offline queue when submission fails online', async () => {
    (useOnlineStatusHook.useOnlineStatus as any).mockReturnValue(true);
    const insertMock = vi.fn().mockResolvedValue({ error: 'fail' });
    (supabase.from as any).mockReturnValue({ insert: insertMock });
    (offlineDb.addToOfflineQueue as any).mockResolvedValue('test-id');

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.submitWithOfflineSupport('test', { foo: 'bar' });
    });

    expect(offlineDb.addToOfflineQueue).toHaveBeenCalledWith('test', { foo: 'bar' });
  });
});
