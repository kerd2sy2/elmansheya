import { Platform } from 'react-native';
import { API_BASE_URL } from '@/core/config/api.config';
import { VillageNotificationItem } from '../types/notifications.types';

type RefreshListener = () => void;
const refreshListeners = new Set<RefreshListener>();

export function notifyNotificationsListeners(): void {
  refreshListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeNotificationsRefresh(cb: RefreshListener): () => void {
  refreshListeners.add(cb);
  return () => {
    refreshListeners.delete(cb);
  };
}

export async function fetchNotificationsFeed(): Promise<VillageNotificationItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/feed`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.data;
    return Array.isArray(list) ? (list as VillageNotificationItem[]) : [];
  } catch {
    return [];
  }
}

export async function registerPushTokenWithBackend(
  token: string,
  phone?: string,
  deviceFingerprint?: string
): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        phone: phone || '',
        device_fingerprint: deviceFingerprint || '',
        platform: Platform.OS,
      }),
    });
  } catch {
    // ignore network errors during background push token registration
  }
}
