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
import { VillageNotificationItem } from '../types/notifications.types';

const NOTIF_STATE_STORAGE_KEY = 'elmansheya_notif_state_v2';
const POLL_INTERVAL_MS = 15_000;

interface StoredNotifState {
  lastClearedTimestamp: number;
  dismissedIds: string[];
}

const DEFAULT_STORED_STATE: StoredNotifState = {
  lastClearedTimestamp: 0,
  dismissedIds: [],
};

export function useNotificationsFeed(userPhone?: string) {
  const [allNotifications, setAllNotifications] = useState<VillageNotificationItem[]>([]);
  const [notifState, setNotifState] = useState<StoredNotifState>(DEFAULT_STORED_STATE);
  const [stateLoaded, setStateLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [latestBannerNotification, setLatestBannerNotification] =
    useState<VillageNotificationItem | null>(null);

  const initialLoadedRef = useRef<boolean>(false);
  const highestSeenTimestampRef = useRef<number>(0);
  const stateRef = useRef<StoredNotifState>(DEFAULT_STORED_STATE);
  const allNotifsRef = useRef<VillageNotificationItem[]>([]);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistNotifState = useCallback(async (nextState: StoredNotifState) => {
    stateRef.current = nextState;
    setNotifState(nextState);
    await setSecureItem(NOTIF_STATE_STORAGE_KEY, nextState);
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
    allNotifsRef.current = items;
    setAllNotifications(items);
    if (!items.length) return;

    const maxTs = items.reduce(
      (acc, cur) => Math.max(acc, Number(cur.timestamp || 0)),
      0
    );

    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      highestSeenTimestampRef.current = Math.max(
        maxTs,
        stateRef.current.lastClearedTimestamp
      );
      return;
    }

    if (maxTs > highestSeenTimestampRef.current) {
      const { lastClearedTimestamp, dismissedIds } = stateRef.current;
      const dismissedSet = new Set(dismissedIds);
      const newest = items.find(
        (it) =>
          Number(it.timestamp || 0) > highestSeenTimestampRef.current &&
          Number(it.timestamp || 0) > lastClearedTimestamp &&
          !dismissedSet.has(it.id)
      );
      highestSeenTimestampRef.current = maxTs;
      if (newest) {
        triggerBanner(newest);
      }
    }
  }, [triggerBanner]);

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await getSecureItem<StoredNotifState>(NOTIF_STATE_STORAGE_KEY);
      if (!active) return;
      if (saved && typeof saved === 'object') {
        const cleanSaved: StoredNotifState = {
          lastClearedTimestamp: Number(saved.lastClearedTimestamp || 0),
          dismissedIds: Array.isArray(saved.dismissedIds)
            ? saved.dismissedIds.slice(-30)
            : [],
        };
        stateRef.current = cleanSaved;
        setNotifState(cleanSaved);
      }
      setStateLoaded(true);
      await refresh();
    })();

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
        // تجاهل في Expo Go
      }
    })();
    return () => {
      active = false;
    };
  }, [userPhone]);

  const notifications = useMemo(() => {
    if (!stateLoaded) return [];
    const { lastClearedTimestamp, dismissedIds } = notifState;
    const dismissedSet = new Set(dismissedIds);
    return allNotifications.filter(
      (item) =>
        Number(item.timestamp || 0) > lastClearedTimestamp &&
        !dismissedSet.has(item.id)
    );
  }, [allNotifications, notifState, stateLoaded]);

  const dismissNotification = useCallback(
    async (id: string) => {
      const { lastClearedTimestamp, dismissedIds } = stateRef.current;
      if (dismissedIds.includes(id)) return;
      const validIds = new Set(
        allNotifsRef.current
          .filter((it) => Number(it.timestamp || 0) > lastClearedTimestamp)
          .map((it) => it.id)
      );
      const nextDismissed = [...dismissedIds, id]
        .filter((itemId) => itemId === id || validIds.has(itemId))
        .slice(-30);
      await persistNotifState({
        lastClearedTimestamp,
        dismissedIds: nextDismissed,
      });
    },
    [persistNotifState]
  );

  const clearAllNotifications = useCallback(async () => {
    const maxItemTs = allNotifsRef.current.reduce(
      (acc, cur) => Math.max(acc, Number(cur.timestamp || 0)),
      0
    );
    const nextClearedTs = Math.max(
      stateRef.current.lastClearedTimestamp,
      maxItemTs,
      Math.floor(Date.now() / 1000)
    );
    await persistNotifState({
      lastClearedTimestamp: nextClearedTs,
      dismissedIds: [],
    });
  }, [persistNotifState]);

  return {
    notifications,
    unreadCount: notifications.length,
    loading,
    refresh,
    dismissNotification,
    clearAllNotifications,
    latestBannerNotification,
    dismissBanner,
  };
}
