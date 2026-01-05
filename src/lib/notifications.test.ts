import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendNotification } from './notifications';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('sendNotification', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error if no auth token is available', async () => {
    // @ts-ignore
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    await sendNotification({
      type: 'employee_action',
      storeId: '1',
      storeName: 'Test Store',
      submitterName: 'Test User',
      details: {},
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('No auth token available for notification');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should send notification successfully when token is present', async () => {
    // @ts-ignore
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    });

    mockFetch.mockResolvedValue({
      ok: true,
    });

    const notificationData = {
      type: 'employee_action' as const,
      storeId: '1',
      storeName: 'Test Store',
      submitterName: 'Test User',
      details: { action: 'test' },
    };

    await sendNotification(notificationData);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/send-notification'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      })
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log error if fetch fails', async () => {
    // @ts-ignore
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    });

    mockFetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Server error'),
    });

    await sendNotification({
      type: 'employee_action',
      storeId: '1',
      storeName: 'Test Store',
      submitterName: 'Test User',
      details: {},
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send notification:', 'Server error');
  });

  it('should log error if exception occurs', async () => {
    // @ts-ignore
    supabase.auth.getSession.mockRejectedValue(new Error('Auth error'));

    await sendNotification({
      type: 'employee_action',
      storeId: '1',
      storeName: 'Test Store',
      submitterName: 'Test User',
      details: {},
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending notification:', expect.any(Error));
  });
});
