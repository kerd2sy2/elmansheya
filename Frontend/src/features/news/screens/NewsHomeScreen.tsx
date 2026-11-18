import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { API_BASE_URL } from '@/core/config/api.config';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { registerHomeScrollToTop } from '@/core/events/scrollEvents';
import { useAuth } from '@/features/auth/context/AuthContext';
import { publishRealNewsArticle } from '../api/news.api';
import { SmallNewsCard } from '../components/SmallNewsCard';
import { useNewsFeed } from '../hooks/useNewsFeed';
import { NewsCardItem } from '../types/news.types';
import { NewsDetailScreen } from './NewsDetailScreen';

interface VillageNotificationItem {
  id: string;
  title: string;
  body: string;
  time_ar: string;
}

const INITIAL_TEST_NOTIFICATIONS: VillageNotificationItem[] = [
  {
    id: 'notif-test-1',
    title: 'قافلة طبية مجانية غداً بالوحدة الصحية',
    body: 'تبدأ القافلة الساعة ٩ صباحاً وتشمل تخصصات الباطنة والأطفال والعيون.',
    time_ar: 'منذ ١٠ دقائق',
  },
  {
    id: 'notif-test-2',
    title: 'تنبيه صيانة شبكة المياه بالمنشية البحرية',
    body: 'سيتم ضعف المياه لمدة ساعتين ظهر اليوم لأعمال الصيانة الدورية.',
    time_ar: 'منذ ساعة',
  },
];

const BASE_HEADER_HEIGHT = 60;

export function NewsHomeScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user } = useAuth();
  const { feed, loading, refreshing, servedFromCache, isOffline, refresh } =
    useNewsFeed();

  const [selectedNews, setSelectedNews] = useState<NewsCardItem | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotificationsModal, setShowNotificationsModal] =
    useState<boolean>(false);
  const [notifications, setNotifications] = useState<VillageNotificationItem[]>(
    INITIAL_TEST_NOTIFICATIONS
  );

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const headerHeight = showSearch ? BASE_HEADER_HEIGHT + 68 : BASE_HEADER_HEIGHT;

  // متغيرات ومراجع التحكم في حركة الهيدر التفاعلي واللوجو
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHeaderHidden = useRef(false);
  const isAnimating = useRef(false);
  const scrollDelta = useRef(0);

  // مراجع تشغيل أنميشن اللوجو وحماية السيرفر من تكرار الطلبات العشوائية
  const lottieRef = useRef<LottieView>(null);
  const lastLogoPressFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  // تأثير شفافية متناسق ومريح للعين مع الحركة
  const headerOpacity = headerTranslateY.interpolate({
    inputRange: [-BASE_HEADER_HEIGHT * 0.7, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const hideHeader = () => {
    if (isHeaderHidden.current || isAnimating.current) return;
    isHeaderHidden.current = true;
    isAnimating.current = true;
    Animated.timing(headerTranslateY, {
      toValue: -headerHeight,
      duration: 260,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const showHeader = () => {
    if (!isHeaderHidden.current || isAnimating.current) return;
    isHeaderHidden.current = false;
    isAnimating.current = true;
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  // معالجة التمرير بحسابات ناعمة تمنع التذبذب واللاج
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;

    // أ) إذا كان المستخدم في قمة الصفحة (<= 15px): أظهر الهيدر فوراً وتفادَ ارتداد iOS
    if (currentY <= 15) {
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
      scrollDelta.current = 0;
      lastScrollY.current = currentY;
      return;
    }

    const diff = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    // ب) السحب لأسفل (Scroll Down): إخفاء ناعم بعد تحرك فعلي 18px وتجاوز 50px من القمة
    if (diff > 0 && currentY > 50) {
      scrollDelta.current = Math.max(0, scrollDelta.current + diff);
      if (scrollDelta.current >= 18) {
        scrollDelta.current = 0;
        hideHeader();
      }
    } else if (diff < 0) {
      // ج) السحب لأعلى (Scroll Up): إظهار فوري وسلس بعد تحرك 16px للأعلى
      scrollDelta.current = Math.min(0, scrollDelta.current + diff);
      if (scrollDelta.current <= -16) {
        scrollDelta.current = 0;
        showHeader();
      }
    }
  };

  const [hasNewNewsUpdate, setHasNewNewsUpdate] = useState<boolean>(false);
  const newestNewsIdRef = useRef<string | null>(null);

  const handlePullToRefresh = async () => {
    // هزة تفاعلية لطيفة وخفيفة في الهاتف بمجرد سحب الشاشة لتحديث الأخبار
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        Vibration.vibrate(25);
      });
    } catch {
      Vibration.vibrate(25);
    }
    setHasNewNewsUpdate(false);
    lastLogoPressFetchRef.current = Date.now();
    await refresh(true);
  };

  const handleLogoPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        Vibration.vibrate(25);
      });
    } catch {
      Vibration.vibrate(25);
    }

    // تشغيل أنميشن اللوجو الأصلي
    lottieRef.current?.reset();
    lottieRef.current?.play();

    // الصعود للأعلى بسلاسة تامة
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    // إظهار الهيدر فوراً
    if (isHeaderHidden.current) {
      isHeaderHidden.current = false;
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      scrollDelta.current = 0;
    }

    // إغلاق البحث إن كان مفتوحاً
    setShowSearch(false);
    setSearchQuery('');

    // حماية الخادم من التكرار العشوائي للطلبات:
    // إذا كان هناك فحص جاري أو تم الفحص حديثاً ولا توجد أخبار جديدة معلنة، لا نرسل طلباً مكرراً
    const now = Date.now();
    const timeSinceLast = now - lastLogoPressFetchRef.current;
    const shouldFetch = hasNewNewsUpdate || timeSinceLast > 12000;

    if (!isFetchingRef.current && shouldFetch) {
      isFetchingRef.current = true;
      lastLogoPressFetchRef.current = now;
      setHasNewNewsUpdate(false);
      try {
        // نحدث الأخبار بهدوء (refresh(false)) بدون إظهار دائرة RefreshControl البيضاء المزعجة
        // وننتظر اكتمال الأنميشن لضمان انسيابية التجربة
        await Promise.all([
          refresh(false),
          new Promise((resolve) => setTimeout(resolve, 850)),
        ]);
      } finally {
        isFetchingRef.current = false;
      }
    }
  };

  useEffect(() => {
    return registerHomeScrollToTop(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
        scrollDelta.current = 0;
      }
    });
  }, [headerTranslateY]);

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

  // فحص ذكي خفيف على فترات متباعدة لتنبيه المستخدم بوجود جديد دون إغراق السيرفر بطلبات
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
        // silent
      }
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  const hasAnyNews = allNewsList.length > 0;

  const displayedNews = useMemo(() => {
    if (!searchQuery.trim()) return allNewsList;
    const q = searchQuery.trim().toLowerCase();
    return allNewsList.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q)
    );
  }, [allNewsList, searchQuery]);

  return (
    <View style={styles.screenContainer}>
      {/* ١. درع شريط الإشعارات الثابت: يضمن بقاء شريط الإشعارات نظيفاً وعدم ظهور المحتوى أو تداخله فيه أبداً */}
      <View
        style={[styles.statusBarShield, { height: topInset }]}
        pointerEvents="none"
      />

      {/* ٢. الهيدر التفاعلي الذكي: يبدأ أسفل شريط الإشعارات مباشرة وبحركة سلسة ومريحة للعين */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.collapsibleHeaderWrap,
          {
            top: topInset,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}>
        <View style={styles.headerRow} pointerEvents="box-none">
          {/* في اليمين: اللوجو تفاعلي عند النقر يشغل الأنميشن ويصعد لأعلى ويجلب المحتوى الجديد */}
          <Pressable
            style={({ pressed }) => [
              styles.headerRightGroup,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
            onPress={handleLogoPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="العودة لأعلى الأخبار وتحديث الصفحة">
            <LottieView
              ref={lottieRef}
              source={require('../../../../assets/json/logo.json')}
              autoPlay={false}
              loop={false}
              progress={1}
              style={styles.headerLottie}
            />
          </Pressable>

          {/* في الشمال: عدسة البحث + جرس التنبيهات (تطبيق القراءة للمواطنين محمي تماماً ولا يحتوي على نشر) */}
          <View style={styles.headerLeftGroup} pointerEvents="auto">
            {/* عدسة البحث الشفافة بدون أي بوكس أو خلفية */}
            <Pressable
              style={styles.headerIconButton}
              onPress={() => setShowSearch((prev) => !prev)}>
              <Ionicons
                name={showSearch ? 'close-outline' : 'search-outline'}
                size={23}
                color={showSearch ? '#973c00' : '#1E293B'}
              />
            </Pressable>

            {/* جرس الإشعارات الشفاف مع عداد حقيقي يعمل فقط عند وجود إشعارات */}
            <Pressable
              style={styles.headerIconButton}
              onPress={() => setShowNotificationsModal(true)}>
              <Ionicons name="notifications-outline" size={23} color="#1E293B" />
              {notifications.length > 0 ? (
                <View style={styles.notifCountBadge}>
                  <Text style={styles.notifCountText}>
                    {notifications.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        {/* حقل البحث السريع في الأخبار بتصميم كارت أبيض نقي بدون اقتصاص الحروف */}
        {showSearch ? (
          <View style={styles.searchBarWrap} pointerEvents="auto">
            <Ionicons name="search-outline" size={20} color="#973c00" />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث في أخبار القرية بالعنوان أو النص..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={10}
                style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={19} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      {/* شريط تنبيه وجود أخبار جديدة: ينبه المستخدم لتحديث الشاشة أو سحبها بدل تكرار الطلبات */}
      {hasNewNewsUpdate ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.newNewsBannerWrap,
            {
              top:
                topInset +
                (showSearch ? BASE_HEADER_HEIGHT + 66 : BASE_HEADER_HEIGHT) +
                8,
            },
          ]}>
          <Pressable
            style={({ pressed }) => [
              styles.newNewsBannerBtn,
              pressed && styles.newNewsBannerBtnPressed,
            ]}
            onPress={handleLogoPress}>
            <View style={styles.newNewsPulseDot} />
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            <Text style={styles.newNewsBannerText}>
              يوجد أخبار وتحديثات جديدة • اضغط أو اسحب للتحديث
            </Text>
            <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

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
        directionalLockEnabled={false}
        alwaysBounceVertical={true}
        overScrollMode="always"
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

        {!loading && !hasAnyNews ? (
          <View style={styles.emptyBox}>
            <Ionicons name="newspaper-outline" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>مفيش أخبار منشورة لحد دلوقتي</Text>
            <Text style={styles.emptyDesc}>
              سيتم نشر أحدث أخبار وفعاليات قرية المنشية هنا فور اعتمادها من إدارة التطبيق.
            </Text>
          </View>
        ) : null}

        <WidgetErrorBoundary widgetNameAr="قائمة الأخبار">
          {(displayedNews?.length ?? 0) > 0 ? (
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
          {(displayedNews?.length ?? 0) > 0 ? (
            <View style={styles.smallNewsList}>
              {displayedNews?.map((item) => (
                <SmallNewsCard
                  key={item.id}
                  item={item}
                  onPress={setSelectedNews}
                />
              ))}
            </View>
          ) : null}
        </WidgetErrorBoundary>
      </ScrollView>

      {/* موديول الإشعارات من الأسفل */}
      <Modal
        visible={showNotificationsModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowNotificationsModal(false)}>
          <Pressable
            style={[
              styles.bottomSheetBox,
              notifications.length === 0 && styles.bottomSheetBoxEmpty,
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />

            {notifications.length === 0 ? (
              <View style={styles.emptyNotifBox}>
                <LottieView
                  source={require('../../../../assets/json/btXbjDx6qo.json')}
                  autoPlay
                  loop
                  style={styles.emptyNotifLottie}
                />
                <Text style={styles.emptyNotifTitle} numberOfLines={1}>
                  لا توجد إشعارات جديدة حالياً
                </Text>
                <Text style={styles.emptyNotifSub} numberOfLines={1}>
                  ستصلك التنبيهات فور نشر أخبار أو مناسبات بالقرية
                </Text>
              </View>
            ) : (
              <View style={styles.notifListWrap}>
                {notifications.map((n) => (
                  <Pressable
                    key={n.id}
                    style={styles.notifItemCard}
                    onPress={() =>
                      setNotifications((prev) =>
                        prev.filter((item) => item.id !== n.id)
                      )
                    }>
                    {/* عمود النصوص: الوقت في أقصى الشمال، والعنوان والبراجراف يبدآن من اليمين */}
                    <View style={styles.notifItemTextCol}>
                      <View style={styles.notifItemTopRow}>
                        <Text style={styles.notifItemTime}>{n.time_ar}</Text>
                        <Text style={styles.notifItemTitle} numberOfLines={1}>
                          {n.title}
                        </Text>
                      </View>

                      <View style={styles.notifItemBodyRow}>
                        <Text style={styles.notifItemBody} numberOfLines={2}>
                          {n.body}
                        </Text>
                      </View>
                    </View>

                    {/* أيقونة الإشعار في أقصى اليمين */}
                    <View style={styles.notifItemIconWrap}>
                      <Ionicons
                        name="notifications-outline"
                        size={18}
                        color="#973c00"
                      />
                    </View>
                  </Pressable>
                ))}

                <Pressable
                  style={styles.clearNotifsBtn}
                  onPress={() => setNotifications([])}>
                  <Text style={styles.clearNotifsBtnText}>
                    تحديد الكل كمقروء
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* شاشة تفاصيل الخبر تفتح كـ Modal سلس للغاية وتغلق فورياً بدون أي تأخير أو تهنيج */}
      <Modal
        visible={Boolean(selectedNews)}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedNews(null)}>
        {selectedNews ? (
          <NewsDetailScreen
            newsId={selectedNews.id}
            initialItem={selectedNews}
            onClose={() => setSelectedNews(null)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statusBarShield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 150,
    backgroundColor: '#F8FAFC',
  },
  collapsibleHeaderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  newNewsBannerWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 120,
    alignItems: 'center',
  },
  newNewsBannerBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    elevation: 8,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  newNewsBannerBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  newNewsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  newNewsBannerText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: rtlTextAlign,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 5,
  },
  smallNewsList: {
    gap: 12,
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerRightGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLottie: {
    width: 44,
    height: 44,
  },
  headerLeftGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  notifCountBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#F8FAFC',
  },
  notifCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  searchBarWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  clearSearchBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  bottomSheetBoxEmpty: {
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 30 : 40,
  },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  emptyNotifLottie: {
    width: 96,
    height: 96,
  },
  emptyNotifBox: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  emptyNotifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyNotifSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  notifListWrap: {
    width: '100%',
    gap: 8,
    paddingTop: 2,
  },
  notifItemCard: {
    width: '100%',
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifItemTextCol: {
    flex: 1,
    direction: 'ltr',
    alignItems: 'flex-end',
    gap: 4,
  },
  notifItemTopRow: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  notifItemTitle: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  notifItemTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'left',
  },
  notifItemBodyRow: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
  },
  notifItemBody: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 19,
  },
  clearNotifsBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  clearNotifsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#973c00',
  },
  cacheChip: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  cacheChipText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#973c00',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0C4A6E',
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'right',
  },
  textArea: {
    height: 76,
    paddingTop: 10,
  },
  switchRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
  },
  switchLabel: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'right',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeaderRow: {
    width: '100%',
    flexDirection: rtlFlexDirection,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
});
