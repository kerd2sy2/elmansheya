import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

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
import { NewsFeedSkeleton } from '../components/NewsFeedSkeleton';
import { SmallNewsCard } from '../components/SmallNewsCard';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
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
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<NewsCardItem>>(null);
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
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
  });

  // كشف ذكي للفيديو النشط على الشاشة مع تفريغ الذاكرة تلقائياً (Native Viewability)
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const visibleVideoItem = viewableItems.find(
      (vt) => Boolean(vt.isViewable && vt.item?.video_stream_url)
    );
    const nextId = visibleVideoItem ? visibleVideoItem.item.id : null;
    setActiveVideoId((prev) => (prev === nextId ? prev : nextId));
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 250,
  }).current;

  // معالجة التمرير للتأثير على الهيدر بسلاسة فائقة
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScrollHeader(event.nativeEvent.contentOffset.y);
    },
    [handleScrollHeader]
  );

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
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  const handleLoadMore = () => {
    if (displayedNews.length > visibleCount) {
      setVisibleCount((prev) => Math.min(prev + INITIAL_PAGE_SIZE, displayedNews.length));
    }
  };

  const renderNewsItem = useCallback(
    ({ item }: { item: NewsCardItem }) => (
      <SmallNewsCard
        item={item}
        isActive={activeVideoId === item.id}
      />
    ),
    [activeVideoId]
  );

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

      {/* شاشة التحميل الهيكلي (Skeleton) - تظهر فقط عند عدم وجود أي داتا في كاش الهاتف أثناء الجلب الأولي */}
      {loading && !feed ? (
        <View
          style={[
            styles.scrollContent,
            {
              paddingTop:
                topInset +
                (showSearch ? BASE_HEADER_HEIGHT + 74 : BASE_HEADER_HEIGHT) +
                10,
              paddingBottom: bottomTabPadding,
            },
          ]}>
          <NewsFeedSkeleton />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={visibleNews}
          keyExtractor={(item) => item.id}
          renderItem={renderNewsItem}
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
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          // تحسينات أداء الذاكرة وسلاسة السكرول الفائقة لمنع التقطيع والتهنيج
          removeClippedSubviews={false}
          maxToRenderPerBatch={6}
          windowSize={7}
          initialNumToRender={5}
          updateCellsBatchingPeriod={40}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              progressViewOffset={topInset + BASE_HEADER_HEIGHT}
              colors={['#973c00']}
              tintColor="#973c00"
            />
          }
          ListHeaderComponent={
            <>
              {isOffline ? (
                <View style={styles.offlineNoticeWrap}>
                  <Ionicons name="cloud-offline-outline" size={15} color="#92400E" />
                  <Text style={styles.offlineNoticeText}>
                    أنت في وضع عدم الاتصال • يتم عرض آخر الأخبار المحفوظة على هاتفك
                  </Text>
                </View>
              ) : null}

              {displayedNews.length > 0 ? (
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>
                    {searchQuery ? 'نتائج البحث' : 'آخر أخبار القرية'}
                  </Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !loading && allNewsList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="newspaper-outline" size={38} color="#94A3B8" />
                <Text style={styles.emptyTitle}>مفيش أخبار منشورة لحد دلوقتي</Text>
                <Text style={styles.emptyDesc}>
                  سيتم نشر أحدث أخبار وفعاليات قرية المنشية هنا فور اعتمادها من إدارة التطبيق.
                </Text>
              </View>
            ) : searchQuery && displayedNews.length === 0 ? (
              <View style={styles.emptySearchBox}>
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchText}>لا توجد نتائج تطابق بحثك</Text>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            displayedNews.length > visibleCount ? (
              <View style={styles.infiniteLoadingRow}>
                <ActivityIndicator size="small" color="#973c00" />
                <Text style={styles.infiniteLoadingText}>
                  جاري تجهيز المزيد من أخبار القرية...
                </Text>
              </View>
            ) : undefined
          }
        />
      )}

      {/* المودال الشفاف للإشعارات السحابية التفاعلية */}
      <NotificationsModal
        visible={showNotificationsModal}
        notifications={notifications}
        loading={notifsLoading}
        onClose={() => setShowNotificationsModal(false)}
        onSelectItem={handleNotificationSelect}
        onClearAll={clearAllNotifications}
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
    backgroundColor: '#FAF5EE',
    zIndex: 150,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  infiniteLoadingRow: {
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
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptySearchBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
