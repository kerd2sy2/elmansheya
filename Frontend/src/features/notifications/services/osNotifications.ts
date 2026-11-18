import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import { registerPushTokenWithBackend } from '../api/notifications.api';
import { VillageNotificationItem } from '../types/notifications.types';

export const ANDROID_CHANNEL_ID = 'elmansheya_high_alerts_v1';

let isHandlerInitialized = false;
let isChannelInitialized = false;

function ensureNotificationHandler(): void {
  if (Platform.OS === 'web' || isHandlerInitialized) return;
  isHandlerInitialized = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // ignore on unsupported environments
  }
}

export async function ensureAndroidHighChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isChannelInitialized) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'إشعارات قرية المنشية',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
    isChannelInitialized = true;
  } catch {
    // ignore channel setup failure
  }
}

export async function initOsNotifications(userPhone?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await ensureAndroidHighChannel();

  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== 'granted') return;

    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) return;

    const fp = await getCompositeDeviceFingerprint().catch(() => '');

    if (Platform.OS === 'android') {
      Notifications.subscribeToTopicAsync('elmansheya_all').catch(() => {});
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (projectId) {
      try {
        const expoTok = await Notifications.getExpoPushTokenAsync({ projectId });
        if (expoTok?.data) {
          await registerPushTokenWithBackend(expoTok.data, userPhone, fp);
        }
      } catch {
        // ignore if Expo push token unavailable
      }
    }

    try {
      const deviceTok = await Notifications.getDevicePushTokenAsync();
      if (typeof deviceTok?.data === 'string' && deviceTok.data) {
        await registerPushTokenWithBackend(deviceTok.data, userPhone, fp);
      }
    } catch {
      // ignore if native device token unavailable
    }
  } catch {
    // ignore initialization error in restricted clients
  }
}

export async function presentOsStatusBarNotification(
  item: VillageNotificationItem
): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await ensureAndroidHighChannel();

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: `${item.section_ar}: ${item.title}`,
        body: item.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
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
  } catch {
    // ignore if notification scheduling is blocked
  }
}

export function subscribeToOsNotificationTap(
  onTap: (data: { id?: string; section?: string; target_id?: string }) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }
  try {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const rawData = (response?.notification?.request?.content?.data ||
          {}) as Record<string, unknown>;
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
