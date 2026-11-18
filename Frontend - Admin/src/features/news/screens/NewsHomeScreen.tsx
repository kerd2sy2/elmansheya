import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { useAuth } from '@/features/auth/context/AuthContext';
import { canAccessSection } from '@/core/permissions/adminRoles';
import { publishRealNewsArticle } from '../api/news.api';
import { BreakingNewsTicker } from '../components/BreakingNewsTicker';
import { FeaturedNewsCard } from '../components/FeaturedNewsCard';
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

export function NewsHomeScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user } = useAuth();
  const isNewsSupervisor = canAccessSection(user?.role, 'news');
  const { feed, loading, refreshing, servedFromCache, refresh } = useNewsFeed();

  const [selectedNews, setSelectedNews] = useState<NewsCardItem | null>(null);
  const [showPublishForm, setShowPublishForm] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotificationsModal, setShowNotificationsModal] =
    useState<boolean>(false);
  const [notifications, setNotifications] = useState<VillageNotificationItem[]>(
    INITIAL_TEST_NOTIFICATIONS
  );
  const [title, setTitle] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isBreaking, setIsBreaking] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const hasAnyNews =
    (feed?.breaking_news?.length ?? 0) > 0 ||
    (feed?.pinned_featured?.length ?? 0) > 0 ||
    (feed?.small_news?.length ?? 0) > 0;

  const displayedSmallNews = useMemo(() => {
    const list = feed?.small_news ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q)
    );
  }, [feed?.small_news, searchQuery]);

  const handlePublish = async () => {
    if (!title.trim() || !summary.trim()) return;
    setSubmitting(true);
    const res = await publishRealNewsArticle({
      title: title.trim(),
      summary: summary.trim(),
      cover_image_url: imageUrl.trim(),
      author_display_name: user?.full_name ?? 'إدارة المنشية',
      is_breaking: isBreaking,
      is_pinned_featured: isPinned,
    });
    setSubmitting(false);
    if (res.ok) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: title.trim(),
          body: summary.trim(),
          time_ar: 'الآن',
        },
        ...prev,
      ]);
      setTitle('');
      setSummary('');
      setImageUrl('');
      setIsBreaking(false);
      setIsPinned(false);
      setShowPublishForm(false);
      refresh();
    }
  };

  if (selectedNews) {
    return (
      <NewsDetailScreen
        newsId={selectedNews.id}
        initialItem={selectedNews}
        onClose={() => {
          setSelectedNews(null);
          refresh();
        }}
      />
    );
  }

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabPadding },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }>
        <View style={styles.headerRow}>
          {/* في اليمين: اللوجو ظاهر وثابت تماماً بلون التطبيق الأساسي (#973c00) بدون أي حركة أو خلفية */}
          <View style={styles.headerRightGroup}>
            <LottieView
              source={require('../../../../assets/json/logo_static.json')}
              autoPlay={false}
              loop={false}
              style={styles.headerLottie}
            />
          </View>

          {/* في الشمال: زر النشر (للمشرف) + عدسة البحث + جرس التنبيهات */}
          <View style={styles.headerLeftGroup}>
            {isNewsSupervisor ? (
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowPublishForm((prev: boolean) => !prev)}>
                <Ionicons
                  name={showPublishForm ? 'close-outline' : 'add-circle-outline'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.addBtnText}>
                  {showPublishForm ? 'إلغاء' : 'نشر'}
                </Text>
              </Pressable>
            ) : null}

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

        {/* حقل البحث السريع في الأخبار عند النقر على العدسة */}
        {showSearch ? (
          <View style={styles.searchBarWrap}>
            <Ionicons name="search-outline" size={18} color="#973c00" />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث في أخبار القرية بالعنوان أو النص..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {isNewsSupervisor && showPublishForm ? (
          <WidgetErrorBoundary widgetNameAr="نموذج نشر خبر جديد">
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>نشر خبر جديد في القرية</Text>
              <TextInput
                style={styles.input}
                placeholder="عنوان الخبر"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="تفاصيل الخبر بالكامل..."
                placeholderTextColor="#94A3B8"
                multiline
                value={summary}
                onChangeText={setSummary}
              />
              <TextInput
                style={styles.input}
                placeholder="رابط صورة الخبر (لو متوفرة)"
                placeholderTextColor="#94A3B8"
                value={imageUrl}
                onChangeText={setImageUrl}
              />

              <View style={styles.switchRow}>
                <Switch value={isPinned} onValueChange={setIsPinned} />
                <Text style={styles.switchLabel}>تثبيت كخبر رئيسي أعلى الشاشة</Text>
              </View>

              <View style={styles.switchRow}>
                <Switch value={isBreaking} onValueChange={setIsBreaking} />
                <Text style={styles.switchLabel}>إظهار في شريط الأخبار العاجلة</Text>
              </View>

              <Pressable
                style={styles.submitBtn}
                onPress={handlePublish}
                disabled={submitting}>
                <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>نشر الخبر الآن</Text>
              </Pressable>
            </View>
          </WidgetErrorBoundary>
        ) : null}

        {loading && !feed ? (
          <ActivityIndicator size="large" color="#0284C7" />
        ) : null}

        {!loading && !hasAnyNews ? (
          <View style={styles.emptyBox}>
            <Ionicons name="newspaper-outline" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>مفيش أخبار منشورة لحد دلوقتي</Text>
            <Text style={styles.emptyDesc}>
              اضغط على زر «نشر خبر» فوق علشان تضيف أول خبر حقيقي لقرية المنشية،
              وهيتحفظ في السيرفر علطول.
            </Text>
          </View>
        ) : null}

        <WidgetErrorBoundary widgetNameAr="شريط الأخبار العاجلة">
          <BreakingNewsTicker items={feed?.breaking_news ?? []} />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary widgetNameAr="الخبر الرئيسي المثبت">
          {feed?.pinned_featured?.map((item) => (
            <FeaturedNewsCard
              key={item.id}
              item={item}
              onPress={setSelectedNews}
            />
          ))}
        </WidgetErrorBoundary>

        <WidgetErrorBoundary widgetNameAr="قائمة الأخبار">
          {(displayedSmallNews?.length ?? 0) > 0 ? (
            <Text style={styles.sectionHeader}>
              {searchQuery ? 'نتائج البحث' : 'آخر أخبار القرية'}
            </Text>
          ) : searchQuery ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>لا توجد نتائج مطابقة</Text>
              <Text style={styles.emptyDesc}>
                لم يتم العثور على أخبار تحتوي على &quot;{searchQuery}&quot;
              </Text>
            </View>
          ) : null}
          {(displayedSmallNews?.length ?? 0) > 0 ? (
            <View style={styles.smallNewsList}>
              {displayedSmallNews?.map((item) => (
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

      {/* موديول الإشعارات من الأسفل بدون تعتيم ولا عنوان ولا أزرار إغلاق */}
      <Modal
        visible={showNotificationsModal}
        transparent
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
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 5,
  },
  smallNewsList: {
    gap: 12,
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'right',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 22 : 30,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  bottomSheetBoxEmpty: {
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 14 : 22,
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 10,
  },
});
