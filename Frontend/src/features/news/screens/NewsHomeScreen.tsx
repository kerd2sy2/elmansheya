import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

import { API_BASE_URL } from '@/core/config/api.config';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { rtlFlexDirection } from '@/core/theme/rtl';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { useAuth } from '@/features/auth/context/AuthContext';
import { NotificationsModal } from '@/features/notifications/components/NotificationsModal';
import { useNotificationsFeed } from '@/features/notifications/hooks/useNotificationsFeed';
import { VillageNotificationItem } from '@/features/notifications/types/notifications.types';

import { BASE_HEADER_HEIGHT, NewsHomeHeader } from '../components/NewsHomeHeader';
import { NewNewsUpdateBanner } from '../components/NewNewsUpdateBanner';
import { SmallNewsCard } from '../components/SmallNewsCard';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { useFeedAutoPlay } from '../hooks/useFeedAutoPlay';
import { useNewsFeed } from '../hooks/useNewsFeed';
import { NewsCardItem } from '../types/news.types';

const INITIAL_PAGE_SIZE = 30;

export function NewsHomeScreen() {
  const router = useRouter();
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user } = useAuth();
  const { feed, loading, refreshing, isOffline, refresh } = useNewsFeed();

  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_PAGE_SIZE);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [hasNewNewsUpdate, setHasNewNewsUpdate] = useState<boolean>(false);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const lottieRef = useRef<LottieView>(null);
  const newestNewsIdRef = useRef<string | null>(null);
  const lastLogoPressFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  // التنقل عند الضغط على إشعار
  const navigateByNotificationTarget = useCallback(
    (section?: string, targetId?: string) => {
      setShowNotificationsModal(false);
      if (section === 'reports') {
        router.push('/reports');
      } else if (section === 'craftsmen') {
        router.push('/craftsmen');
      } else if (section === 'services') {
        router.push('/services');
      } else if (section === 'news') {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    },
    [router]
  );

  const {
    notifications,
    unreadCount,
    loading: notifsLoading,
    refresh: refreshNotifications,
    dismissNotification,
    clearAllNotifications,
  } = useNotificationsFeed(user?.phone, (data) =>
    navigateByNotificationTarget(data.section, data.target_id)
  );

  const handleNotificationSelect = (item: VillageNotificationItem) => {
    dismissNotification(item.id);
    navigateByNotificationTarget(item.section, item.target_id);
  };

  // دمج وتوحيد قائمة الأخبار
  const allNewsList = useMemo(() => {
    const pinned = feed?.pinned_featured ?? [];
    const small = feed?.small_news ?? [];
    const seen = new Set<string>();
    const list: NewsCardItem[] = [];
    for (const it of [...pinned, ...small]) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        list.push(it);
      }
    }
    return list;
  }, [feed?.pinned_featured, feed?.small_news]);

  useEffect(() => {
    if (allNewsList.length > 0) {
      newestNewsIdRef.current = allNewsList[0]?.id;
    }
  }, [allNewsList]);

  // فلترة البحث
  const displayedNews = useMemo(() => {
    if (!searchQuery.trim()) return allNewsList;
    const q = searchQuery.trim().toLowerCase();
    return allNewsList.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q)
    );
  }, [allNewsList, searchQuery]);

  // تقسيم الأخبار لحماية استهلاك الذاكرة (30 ثم 30)
  const visibleNews = useMemo(() => {
    return displayedNews.slice(0, visibleCount);
  }, [displayedNews, visibleCount]);

  // هوك إدارة الفيديو الذكي أثناء التمرير
  const { activeVideoId, updateActiveVideo, onListLayout, onCardLayout } =
    useFeedAutoPlay(visibleNews);

  // هوك إدارة الهيدر التفاعلي مع السكرول
  const headerHeight = showSearch ? BASE_HEADER_HEIGHT + 68 : BASE_HEADER_HEIGHT;
  const {
    headerTranslateY,
    headerOpacity,
    isHeaderHidden,
    handleScrollHeader,
    showHeader,
  } = useCollapsibleHeader({
    headerHeight,
    onScrollToTopRequest: () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
  });

  // معالجة التمرير وتحديث الفيديو والتحميل اللانهائي
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const currentY = contentOffset.y;

    handleScrollHeader(currentY);
    updateActiveVideo(currentY, layoutMeasurement.height);

    const isCloseToBottom =
      layoutMeasurement.height + currentY >= contentSize.height - 400;
    if (isCloseToBottom && displayedNews.length > visibleCount) {
      setVisibleCount((prev) => Math.min(prev + INITIAL_PAGE_SIZE, displayedNews.length));
    }
  };

  // تفاعل الضغط على لوجو المنشية في الهيدر
  const handleLogoPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        Vibration.vibrate(25);
      });
    } catch {
      Vibration.vibrate(25);
    }

    lottieRef.current?.reset();
    lottieRef.current?.play();
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    showHeader();
    setShowSearch(false);
    setSearchQuery('');

    const now = Date.now();
    const timeSinceLast = now - lastLogoPressFetchRef.current;
    const shouldFetch = hasNewNewsUpdate || timeSinceLast > 12000;

    if (!isFetchingRef.current && shouldFetch) {
      isFetchingRef.current = true;
      lastLogoPressFetchRef.current = now;
      setHasNewNewsUpdate(false);
      try {
        await Promise.all([
          refresh(false),
          new Promise((resolve) => setTimeout(resolve, 850)),
        ]);
      } finally {
        isFetchingRef.current = false;
      }
    }
  };

  const handlePullToRefresh = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        Vibration.vibrate(25);
      });
    } catch {
      Vibration.vibrate(25);
    }
    setHasNewNewsUpdate(false);
    lastLogoPressFetchRef.current = Date.now();
    await refresh(true);
  };

  // فحص خفيف على فترات متباعدة لتنبيه المستخدم بوجود جديد دون إغراق السيرفر
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/news/feed`);
        if (res.ok) {
          const json = await res.json();
          const items = [
            ...(json?.data?.pinned_featured ?? []),
            ...(json?.data?.small_news ?? []),
          ];
          if (items.length > 0 && newestNewsIdRef.current) {
            const firstId = items[0]?.id;
            if (firstId && firstId !== newestNewsIdRef.current) {
              setHasNewNewsUpdate(true);
            }
          }
        }
      } catch {
        // صامت لتفادي أي إزعاج
      }
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.screenContainer}>
      {/* درع شريط الحالة العلوي */}
      <View
        style={[styles.statusBarShield, { height: topInset }]}
        pointerEvents="none"
      />

      {/* الهيدر التفاعلي المستقل */}
      <NewsHomeHeader
        topInset={topInset}
        headerTranslateY={headerTranslateY}
        headerOpacity={headerOpacity}
        showSearch={showSearch}
        searchQuery={searchQuery}
        unreadCount={unreadCount}
        lottieRef={lottieRef}
        onPressLogo={handleLogoPress}
        onToggleSearch={() => setShowSearch((prev) => !prev)}
        onChangeSearch={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onPressNotifications={() => {
          setShowNotificationsModal(true);
          refreshNotifications();
        }}
      />

      {/* شريط الإشعار بوجود أخبار جديدة */}
      <NewNewsUpdateBanner
        visible={hasNewNewsUpdate}
        topInset={topInset}
        showSearch={showSearch}
        onPress={handleLogoPress}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop:
              topInset +
              (showSearch ? BASE_HEADER_HEIGHT + 74 : BASE_HEADER_HEIGHT) +
              10,
            paddingBottom: bottomTabPadding,
          },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        canCancelContentTouches={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            progressViewOffset={topInset + BASE_HEADER_HEIGHT}
            colors={['#973c00']}
            tintColor="#973c00"
          />
        }>
        {isOffline ? (
          <View style={styles.offlineNoticeWrap}>
            <Ionicons name="cloud-offline-outline" size={15} color="#92400E" />
            <Text style={styles.offlineNoticeText}>
              أنت في وضع عدم الاتصال • يتم عرض آخر الأخبار المحفوظة على هاتفك
            </Text>
          </View>
        ) : null}

        {loading && !feed ? (
          <ActivityIndicator size="large" color="#0284C7" />
        ) : null}

        {!loading && allNewsList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="newspaper-outline" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>مفيش أخبار منشورة لحد دلوقتي</Text>
            <Text style={styles.emptyDesc}>
              سيتم نشر أحدث أخبار وفعاليات قرية المنشية هنا فور اعتمادها من إدارة التطبيق.
            </Text>
          </View>
        ) : null}

        <WidgetErrorBoundary widgetNameAr="قائمة الأخبار">
          {displayedNews.length > 0 ? (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                {searchQuery ? 'نتائج البحث' : 'آخر أخبار القرية'}
              </Text>
            </View>
          ) : searchQuery ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>لا توجد نتائج مطابقة</Text>
              <Text style={styles.emptyDesc}>
                لم يتم العثور على أخبار تحتوي على &quot;{searchQuery}&quot;
              </Text>
            </View>
          ) : null}

          {displayedNews.length > 0 ? (
            <View style={styles.smallNewsList} onLayout={onListLayout}>
              {visibleNews.map((item) => (
                <SmallNewsCard
                  key={item.id}
                  item={item}
                  isActive={activeVideoId === item.id}
                  onLayout={(e) => onCardLayout(item.id, e)}
                />
              ))}

              {displayedNews.length > visibleCount ? (
                <View style={styles.infiniteLoadingBox}>
                  <ActivityIndicator size="small" color="#973c00" />
                  <Text style={styles.infiniteLoadingText}>
                    جاري تحميل أخبار القرية التالية تلقائياً...
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </WidgetErrorBoundary>
      </ScrollView>

      {/* نافذة الإشعارات الموحدة */}
      <NotificationsModal
        visible={showNotificationsModal}
        notifications={notifications}
        loading={notifsLoading}
        onSelectItem={handleNotificationSelect}
        onClearAll={clearAllNotifications}
        onClose={() => setShowNotificationsModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  statusBarShield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 150,
    backgroundColor: '#FAF5EE',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 5,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  smallNewsList: {
    gap: 12,
  },
  infiniteLoadingBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    marginBottom: 10,
  },
  infiniteLoadingText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  offlineNoticeWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  offlineNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
});
