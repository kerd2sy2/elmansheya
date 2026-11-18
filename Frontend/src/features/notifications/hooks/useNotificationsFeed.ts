import * as Haptics from 'expo-haptics';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import {
  fetchNotificationsFeed,
  registerPushTokenWithBackend,
  subscribeNotificationsRefresh,
} from '../api/notifications.api';
import {
  NotificationSectionKey,
  VillageNotificationItem,
} from '../types/notifications.types';

const READ_NOTIFS_STORAGE_KEY = 'elmansheya_read_notifs_v1';
const POLL_INTERVAL_MS = 15_000;

export function useNotificationsFeed(userPhone?: string) {
  const [notifications, setNotifications] = useState<VillageNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<NotificationSectionKey>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [latestBannerNotification, setLatestBannerNotification] =
    useState<VillageNotificationItem | null>(null);

  const initialLoadedRef = useRef<boolean>(false);
  const highestSeenTimestampRef = useRef<number>(0);
  const readIdsRef = useRef<string[]>([]);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistReadIds = useCallback(async (nextIds: string[]) => {
    const trimmed = nextIds.slice(-150);
    readIdsRef.current = trimmed;
    setReadIds(trimmed);
    await setSecureItem(READ_NOTIFS_STORAGE_KEY, trimmed);
  }, []);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setLatestBannerNotification(null);
  }, []);

  const triggerBanner = useCallback(
    (item: VillageNotificationItem) => {
      dismissBanner();
      setLatestBannerNotification(item);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      bannerTimerRef.current = setTimeout(() => {
        setLatestBannerNotification(null);
        bannerTimerRef.current = null;
      }, 5000);
    },
    [dismissBanner]
  );

  const refresh = useCallback(async () => {
    const items = await fetchNotificationsFeed();
    setLoading(false);
    if (!items.length) return;

    setNotifications(items);
    const maxTs = items.reduce(
      (acc, cur) => Math.max(acc, Number(cur.timestamp || 0)),
      0
    );

    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      highestSeenTimestampRef.current = maxTs;
      return;
    }

    if (maxTs > highestSeenTimestampRef.current) {
      const readSet = new Set(readIdsRef.current);
      const newest = items.find(
        (it) =>
          Number(it.timestamp || 0) > highestSeenTimestampRef.current &&
          !readSet.has(it.id)
      );
      highestSeenTimestampRef.current = maxTs;
      if (newest) {
        triggerBanner(newest);
      }
    }
  }, [triggerBanner]);

  useEffect(() => {
    let active = true;
    getSecureItem<string[]>(READ_NOTIFS_STORAGE_KEY).then((saved) => {
      if (!active || !Array.isArray(saved)) return;
      readIdsRef.current = saved;
      setReadIds(saved);
    });
    refresh();

    const unsubscribe = subscribeNotificationsRefresh(() => {
      refresh();
    });
    const timer = setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    (async () => {
      try {
        const pushMgr = requireOptionalNativeModule<{
          getDevicePushTokenAsync?: () => Promise<{ data?: string } | string>;
        }>('ExpoPushTokenManager');
        if (!pushMgr?.getDevicePushTokenAsync) return;

        const tokenRes = await pushMgr.getDevicePushTokenAsync();
        const token =
          typeof tokenRes === 'string'
            ? tokenRes
            : typeof tokenRes?.data === 'string'
            ? tokenRes.data
            : '';
        if (!active || !token) return;
        const fp = await getCompositeDeviceFingerprint().catch(() => '');
        await registerPushTokenWithBackend(token, userPhone, fp);
      } catch {
        // تجاهل إذا كانت بيئة Expo Go لا تدعم الإشعارات البعيدة الأصلية
      }
    })();
    return () => {
      active = false;
    };
  }, [userPhone]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readSet.has(n.id)).length,
    [notifications, readSet]
  );

  const filteredNotifications = useMemo(() => {
    if (activeSection === 'all') return notifications;
    return notifications.filter((n) => n.section === activeSection);
  }, [activeSection, notifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (readIdsRef.current.includes(id)) return;
      await persistReadIds([...readIdsRef.current, id]);
    },
    [persistReadIds]
  );

  const markAllAsRead = useCallback(async () => {
    const allIds = Array.from(
      new Set([...readIdsRef.current, ...notifications.map((n) => n.id)])
    );
    await persistReadIds(allIds);
  }, [notifications, persistReadIds]);

  return {
    notifications,
    filteredNotifications,
    unreadCount,
    readIds,
    activeSection,
    setActiveSection,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    latestBannerNotification,
    dismissBanner,
  };
}
