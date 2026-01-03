import { supabase } from './supabase';

interface NotificationData {
  type: 'employee_action' | 'inventory_action' | 'cash_action' | 'store_action' | 'employee_report' | 'follow_up_reminder';
  storeId: string;
  storeName: string;
  submitterName: string;
  severity?: string;
  actionType?: string;
  details: Record<string, unknown>;
}

export async function sendNotification(data: NotificationData): Promise<void> {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      console.error('No auth token available for notification');
      return;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send notification:', error);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
