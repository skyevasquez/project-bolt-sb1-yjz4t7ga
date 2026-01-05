import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('useOnlineStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the current online status', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should update status when offline event is fired', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('should update status when online event is fired', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });
});
