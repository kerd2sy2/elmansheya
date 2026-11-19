import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/core/config/api.config';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import { registerPushTokenWithBackend } from '../api/notifications.api';
import { VillageNotificationItem } from '../types/notifications.types';

export const ANDROID_CHANNEL_ID = 'elmansheya_alerts_v2';
const LEGACY_CHANNEL_ID = 'elmansheya_high_alerts_v1';

let isHandlerInitialized = false;
let isChannelInitialized = false;
let lastPermStatus = 'unknown';

function hasNativeModule(name: string): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return Boolean(requireOptionalNativeModule(name));
  } catch {
    return false;
  }
}

async function sendDiagnosticPing(
  stage: string,
  extra?: { scheduled_ok?: boolean; error?: string; phone?: string }
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await fetch(`${API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'diag',
        stage,
        phone: extra?.phone || '',
        platform: Platform.OS,
        exec_env: String(Constants.executionEnvironment || ''),
        has_scheduler: hasNativeModule('ExpoNotificationScheduler'),
        has_channel_mgr: hasNativeModule('ExpoNotificationChannelManager'),
        has_handler_mod: hasNativeModule('ExpoNotificationsHandlerModule'),
        has_perms_mod: hasNativeModule('ExpoNotificationPermissionsModule'),
        has_emitter_mod: hasNativeModule('ExpoNotificationsEmitter'),
        perm_status: lastPermStatus,
        scheduled_ok: extra?.scheduled_ok,
        error: extra?.error || '',
      }),
    });
  } catch {
    // ignore diagnostic transport failure
  }
}

function ensureNotificationHandler(): void {
  if (Platform.OS === 'web' || isHandlerInitialized) return;
  if (!hasNativeModule('ExpoNotificationsHandlerModule')) return;
  try {
    const { setNotificationHandler } = require('expo-notifications/build/NotificationsHandler');
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    isHandlerInitialized = true;
  } catch {
    // ignore handler registration error
  }
}

export async function ensureAndroidHighChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isChannelInitialized) return;
  if (!hasNativeModule('ExpoNotificationChannelManager')) return;

  try {
    try {
      const channelMod = requireOptionalNativeModule<{
        deleteNotificationChannelAsync?: (channelId: string) => Promise<void>;
      }>('ExpoNotificationChannelManager');
      await channelMod?.deleteNotificationChannelAsync?.(LEGACY_CHANNEL_ID);
    } catch {
      // ignore legacy cleanup
    }

    const { setNotificationChannelAsync } = require('expo-notifications/build/setNotificationChannelAsync.android');
    // عدم تمرير مفتاح sound يجعل أندرويد يستخدم نغمة الإشعارات الافتراضية DEFAULT_NOTIFICATION_URI تلقائياً
    await setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'إشعارات قرية المنشية',
      importance: 5, // AndroidImportance.MAX
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: 1, // PUBLIC
      showBadge: true,
    });
    isChannelInitialized = true;
  } catch {
    // ignore channel setup error
  }
}

export async function initOsNotifications(userPhone?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await ensureAndroidHighChannel();

  let diagErr = '';
  try {
    if (hasNativeModule('ExpoNotificationPermissionsModule')) {
      const {
        getPermissionsAsync,
        requestPermissionsAsync,
      } = require('expo-notifications/build/NotificationPermissions');
      const existing = await getPermissionsAsync();
      lastPermStatus = String(existing?.status || (existing?.granted ? 'granted' : 'denied'));
      if (!existing?.granted && existing?.status !== 'granted') {
        const requested = await requestPermissionsAsync();
        lastPermStatus = String(requested?.status || (requested?.granted ? 'granted' : 'denied'));
      }
    }

    const pushMgr = requireOptionalNativeModule<{
      getDevicePushTokenAsync?: () => Promise<string | { data?: string }>;
    }>('ExpoPushTokenManager');
    if (pushMgr?.getDevicePushTokenAsync && (Constants.executionEnvironment as string) !== 'storeClient') {
      const fp = await getCompositeDeviceFingerprint().catch(() => '');
      const deviceTok = await pushMgr.getDevicePushTokenAsync();
      const token =
        typeof deviceTok === 'string'
          ? deviceTok
          : typeof deviceTok === 'object' && deviceTok !== null
          ? String((deviceTok as { data?: string }).data || '')
          : '';
      if (token) {
        await registerPushTokenWithBackend(token, userPhone, fp);
      }
    }
  } catch (err: any) {
    diagErr = String(err?.message || err || '');
  }

  await sendDiagnosticPing('init', { phone: userPhone, error: diagErr });
}

export async function presentOsStatusBarNotification(
  item: VillageNotificationItem
): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await ensureAndroidHighChannel();

  if (!hasNativeModule('ExpoNotificationScheduler')) {
    await sendDiagnosticPing('present_no_scheduler', {
      scheduled_ok: false,
      error: 'ExpoNotificationScheduler unavailable',
    });
    return;
  }

  try {
    const { scheduleNotificationAsync } = require('expo-notifications/build/scheduleNotificationAsync');
    await scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: `${item.section_ar}: ${item.title}`,
        body: item.body,
        sound: true,
        vibrate: [0, 250, 250, 250],
        priority: 'max',
        color: '#973c00',
        data: {
          id: item.id,
          section: item.section,
          target_id: item.target_id || '',
        },
      },
      trigger:
        Platform.OS === 'android'
          ? { channelId: ANDROID_CHANNEL_ID }
          : null,
    });
    await sendDiagnosticPing('present', { scheduled_ok: true });
  } catch (err: any) {
    await sendDiagnosticPing('present', {
      scheduled_ok: false,
      error: String(err?.message || err || ''),
    });
  }
}

export function subscribeToOsNotificationTap(
  onTap: (data: { id?: string; section?: string; target_id?: string }) => void
): () => void {
  if (Platform.OS === 'web' || !hasNativeModule('ExpoNotificationsEmitter')) {
    return () => {};
  }
  try {
    const { addNotificationResponseReceivedListener } = require('expo-notifications/build/NotificationsEmitter');
    const sub = addNotificationResponseReceivedListener((response: any) => {
      const rawData = (response?.notification?.request?.content?.data || {}) as Record<
        string,
        unknown
      >;
      onTap({
        id: typeof rawData.id === 'string' ? rawData.id : undefined,
        section: typeof rawData.section === 'string' ? rawData.section : undefined,
        target_id:
          typeof rawData.target_id === 'string' ? rawData.target_id : undefined,
      });
    });
    return () => {
      sub?.remove?.();
    };
  } catch {
    return () => {};
  }
}
