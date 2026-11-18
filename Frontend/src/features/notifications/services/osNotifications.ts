import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import { registerPushTokenWithBackend } from '../api/notifications.api';
import { VillageNotificationItem } from '../types/notifications.types';

export const ANDROID_CHANNEL_ID = 'elmansheya_high_alerts_v1';

interface NotificationHandlerNativeModule {
  addListener?: (
    eventName: string,
    listener: (event: { id?: string }) => void
  ) => { remove: () => void };
  handleNotificationAsync?: (
    notificationId: string,
    behavior: {
      shouldShowAlert: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }
  ) => Promise<void>;
}

interface NotificationChannelNativeModule {
  setNotificationChannelAsync?: (
    channelId: string,
    channel: Record<string, unknown>
  ) => Promise<unknown>;
}

interface NotificationPermissionsNativeModule {
  getPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  requestPermissionsAsync?: (
    permissions?: Record<string, unknown>
  ) => Promise<{ status?: string; granted?: boolean }>;
}

interface NotificationSchedulerNativeModule {
  scheduleNotificationAsync?: (
    identifier: string,
    content: Record<string, unknown>,
    trigger: Record<string, unknown> | null
  ) => Promise<string>;
}

interface NotificationsEmitterNativeModule {
  addListener?: (
    eventName: string,
    listener: (response: Record<string, any>) => void
  ) => { remove: () => void };
}

interface PushTokenManagerNativeModule {
  getDevicePushTokenAsync?: () => Promise<string | { data?: string }>;
}

let handlerSub: { remove: () => void } | null = null;
let isChannelInitialized = false;

function getOptional<T>(name: string): T | null {
  if (Platform.OS === 'web') return null;
  try {
    return requireOptionalNativeModule<T>(name);
  } catch {
    return null;
  }
}

function ensureNotificationHandler(): void {
  if (Platform.OS === 'web' || handlerSub) return;
  const handlerMod = getOptional<NotificationHandlerNativeModule>(
    'ExpoNotificationsHandlerModule'
  );
  if (!handlerMod?.addListener) return;

  try {
    handlerSub = handlerMod.addListener('onHandleNotification', async (ev) => {
      try {
        if (ev?.id && handlerMod.handleNotificationAsync) {
          await handlerMod.handleNotificationAsync(ev.id, {
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          });
        }
      } catch {
        // ignore foreground notification response failure
      }
    });
  } catch {
    // ignore listener errors
  }
}

export async function ensureAndroidHighChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isChannelInitialized) return;
  const channelMod = getOptional<NotificationChannelNativeModule>(
    'ExpoNotificationChannelManager'
  );
  if (!channelMod?.setNotificationChannelAsync) return;

  try {
    await channelMod.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'إشعارات قرية المنشية',
      importance: 5, // AndroidImportance.MAX
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: 1, // AndroidNotificationVisibility.PUBLIC
      showBadge: true,
    });
    isChannelInitialized = true;
  } catch {
    // ignore channel creation failure
  }
}

export async function initOsNotifications(userPhone?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await ensureAndroidHighChannel();

  try {
    const permsMod = getOptional<NotificationPermissionsNativeModule>(
      'ExpoNotificationPermissionsModule'
    );
    if (permsMod?.getPermissionsAsync) {
      const existing = await permsMod.getPermissionsAsync();
      let granted = Boolean(existing?.granted || existing?.status === 'granted');
      if (!granted && permsMod.requestPermissionsAsync) {
        const reqCfg =
          Platform.OS === 'ios'
            ? { allowAlert: true, allowBadge: true, allowSound: true }
            : undefined;
        const requested = await permsMod.requestPermissionsAsync(reqCfg);
        granted = Boolean(requested?.granted || requested?.status === 'granted');
      }
      if (!granted) return;
    }

    const pushMgr = getOptional<PushTokenManagerNativeModule>('ExpoPushTokenManager');
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
  } catch {
    // ignore restricted native permissions/tokens errors
  }
}

export async function presentOsStatusBarNotification(
  item: VillageNotificationItem
): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await ensureAndroidHighChannel();

  const scheduler = getOptional<NotificationSchedulerNativeModule>(
    'ExpoNotificationScheduler'
  );
  if (!scheduler?.scheduleNotificationAsync) return;

  try {
    await scheduler.scheduleNotificationAsync(
      item.id,
      {
        title: `${item.section_ar}: ${item.title}`,
        body: item.body,
        sound: 'default',
        priority: 'max',
        data: {
          id: item.id,
          section: item.section,
          target_id: item.target_id || '',
        },
      },
      Platform.OS === 'android'
        ? { type: 'channel', channelId: ANDROID_CHANNEL_ID }
        : null
    );
  } catch {
    // ignore scheduling errors
  }
}

function extractNotificationData(
  response: Record<string, any>
): Record<string, unknown> {
  const content = response?.notification?.request?.content;
  if (!content) return {};
  if (content.data && typeof content.data === 'object') {
    return content.data as Record<string, unknown>;
  }
  if (typeof content.dataString === 'string') {
    try {
      const parsed = JSON.parse(content.dataString);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore invalid JSON dataString
    }
  }
  return {};
}

export function subscribeToOsNotificationTap(
  onTap: (data: { id?: string; section?: string; target_id?: string }) => void
): () => void {
  if (Platform.OS === 'web') return () => {};
  const emitter = getOptional<NotificationsEmitterNativeModule>(
    'ExpoNotificationsEmitter'
  );
  if (!emitter?.addListener) return () => {};

  try {
    const sub = emitter.addListener(
      'onDidReceiveNotificationResponse',
      (response) => {
        const rawData = extractNotificationData(response);
        onTap({
          id: typeof rawData.id === 'string' ? rawData.id : undefined,
          section:
            typeof rawData.section === 'string' ? rawData.section : undefined,
          target_id:
            typeof rawData.target_id === 'string'
              ? rawData.target_id
              : undefined,
        });
      }
    );
    return () => {
      sub.remove();
    };
  } catch {
    return () => {};
  }
}
