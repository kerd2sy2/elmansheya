import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  I18nManager,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { API_BASE_URL } from '@/core/config/api.config';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { CraftsmanCard } from '../components/CraftsmanCard';
import { RatingModal } from '../components/RatingModal';
import {
  ALL_CRAFTSMEN_CATEGORIES,
  CraftsmanCategory,
  CraftsmanItem,
  CraftsmanReviewItem,
  CraftsmanWorkItem,
} from '../types/craftsmen.types';
import { SEED_CRAFTSMEN } from '../data/craftsmen.mock';

interface CraftsmenDirectoryResponse {
  categories: CraftsmanCategory[];
  craftsmen: CraftsmanItem[];
}

const DEFAULT_PORTFOLIO_BY_SPECIALTY: Record<string, CraftsmanWorkItem[]> = {
  'كهرباء منازل': [
    {
      id: 'dw-elec-1',
      title: 'تأسيس شبكة كهرباء شقة بالكامل',
      image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
      description: 'تمديد خراطيم وتوزيع لوحات القواطع وشبكة الإنارة المخفية والسبوتات',
    },
    {
      id: 'dw-elec-2',
      title: 'تشطيب إضاءة ليد وديكور جبس',
      image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80',
      description: 'تركيب بروفايل ليد ولمسات إنارة عصرية للصالات والغرف',
    },
  ],
  'سباكة وصحي': [
    {
      id: 'dw-plumb-1',
      title: 'تأسيس حمام ومطبخ عازل بالكامل',
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
      description: 'عزل أرضيات وشبكة تغذية بولي بروبلين ألماني مع اختبار ضغط البار',
    },
    {
      id: 'dw-plumb-2',
      title: 'تركيب أطقم صحي وخلاطات دفن',
      image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',
      description: 'تشطيب أحدث أطقم الخلاطات والدش الدفن بتنسيق مريح ومتقن',
    },
  ],
  'نجارة خشب': [
    {
      id: 'dw-carp-1',
      title: 'تصنيع وتركيب أبواب غرف زان وقرو',
      image_url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80',
      description: 'نجارة أبواب وشبابيك متينة وتشطيب بمواصفات عالية',
    },
    {
      id: 'dw-carp-2',
      title: 'تنفيذ مطبخ خشب مودرن متكامل',
      image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80',
      description: 'تصميم وحدات تخزين مريحة باستغلال ذكي للمساحات',
    },
  ],
  'نقاشة ودهانات': [
    {
      id: 'dw-paint-1',
      title: 'دهانات وتشطيبات صالون وجدران قطيفة',
      image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
      description: 'سحب معجون دقيق وتشطيب دهانات ديكورية مبهجة وألوان ثابتة',
    },
    {
      id: 'dw-paint-2',
      title: 'تنسيق ألوان عصرية وتجهيز أسقف',
      image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      description: 'تنفيذ دهانات قابلة للغسيل ومقاومة للرطوبة',
    },
  ],
  'ألوميتال وزجاج': [
    {
      id: 'dw-alum-1',
      title: 'تركيب شبابيك ألوميتال دبل جلاس عازل للصوت',
      image_url: 'https://images.unsplash.com/photo-1503708928676-1cb796a0891e?w=800&q=80',
      description: 'قطاعات بي إس مانعة لدخول الأتربة والحرارة مع زجاج عاكس',
    },
  ],
};

function getCraftsmanPortfolioList(item: CraftsmanItem): CraftsmanWorkItem[] {
  if (item.portfolio && item.portfolio.length > 0) {
    return item.portfolio;
  }
  for (const [key, works] of Object.entries(DEFAULT_PORTFOLIO_BY_SPECIALTY)) {
    if (item.specialty.includes(key) || key.includes(item.specialty)) {
      return works;
    }
  }
  return [
    {
      id: `dw-gen-${item.id}`,
      title: `تنفيذ أعمال ${item.specialty}`,
      image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
      description: `تسليم متقن وجودة عالية في صيانة وتنفيذ ${item.specialty} لأهالي القرية`,
    },
  ];
}

export function CraftsmenScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();

  const [categories, setCategories] = useState<CraftsmanCategory[]>(
    ALL_CRAFTSMEN_CATEGORIES
  );
  const [craftsmen, setCraftsmen] = useState<CraftsmanItem[]>(SEED_CRAFTSMEN);

  // الوظيفة/الصنعة المختارة لعرض صفحة الصنايعية الخاصة بها
  const [selectedProfession, setSelectedProfession] =
    useState<CraftsmanCategory | null>(null);
  // الصنايعي المختار لعرض صفحته التفصيلية الكاملة
  const [selectedCraftsman, setSelectedCraftsman] =
    useState<CraftsmanItem | null>(null);

  // نافذة التقييم من الأسفل (Bottom Sheet)
  const [ratingTarget, setRatingTarget] = useState<CraftsmanItem | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // مراجعات وتقييمات الصنايعي المختار
  const [craftsmanReviews, setCraftsmanReviews] = useState<CraftsmanReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [previewWorkImage, setPreviewWorkImage] = useState<string | null>(null);

  const loadCraftsmanReviews = useCallback(async (craftsmanId: string) => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`${API_BASE_URL}/ratings/?craftsman_id=${craftsmanId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setCraftsmanReviews(json.data);
          return;
        }
      }
      setCraftsmanReviews([]);
    } catch {
      setCraftsmanReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCraftsman) {
      loadCraftsmanReviews(selectedCraftsman.id);
    } else {
      setCraftsmanReviews([]);
    }
  }, [selectedCraftsman, loadCraftsmanReviews]);

  const loadDirectory = useCallback(async () => {
    const res = await fetchModuleData<CraftsmenDirectoryResponse>(
      'craftsmen',
      '/craftsmen/',
      {
        cooldownMs: 0,
        fallbackData: {
          categories: ALL_CRAFTSMEN_CATEGORIES,
          craftsmen: SEED_CRAFTSMEN,
        },
      }
    );
    if (res.data?.categories && res.data.categories.length >= ALL_CRAFTSMEN_CATEGORIES.length) {
      setCategories(res.data.categories);
    } else {
      setCategories(ALL_CRAFTSMEN_CATEGORIES);
    }
    const loadedCraftsmen = res.data?.craftsmen ?? [];
    setCraftsmen(loadedCraftsmen);

    // تحديث بيانات الصنايعي المفتوح حالياً إن وُجد بعد التقييم
    setSelectedCraftsman((prev) => {
      if (!prev) return null;
      return loadedCraftsmen.find((c) => c.id === prev.id) || prev;
    });
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  // دعم زر الرجوع في الهاتف للعودة خطوة واحدة دائماً: من صفحة الصنايعي -> صفحة الصنعة -> كل الوظائف
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (previewWorkImage) {
          setPreviewWorkImage(null);
          return true;
        }
        if (ratingTarget) {
          setRatingTarget(null);
          return true;
        }
        if (selectedCraftsman) {
          setSelectedCraftsman(null);
          return true;
        }
        if (selectedProfession) {
          setSelectedProfession(null);
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [previewWorkImage, ratingTarget, selectedCraftsman, selectedProfession])
  );

  // مطابقة الصنايعي مع الصنعة المختارة
  const doesCraftsmanMatchCategory = useCallback(
    (item: CraftsmanItem, cat: CraftsmanCategory): boolean => {
      const firstWord = cat.name_ar.split(' ')[0];
      return (
        item.specialty === cat.name_ar ||
        item.specialty.includes(cat.name_ar) ||
        (firstWord.length > 2 && item.specialty.includes(firstWord))
      );
    },
    []
  );

  // حساب عدد الصنايعية في كل وظيفة
  const countByProfession = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = craftsmen.filter((item) =>
        doesCraftsmanMatchCategory(item, cat)
      ).length;
    }
    return counts;
  }, [categories, craftsmen, doesCraftsmanMatchCategory]);

  // تصفية الوظائف في الشاشة الرئيسية
  const filteredCategories = categories;

  // تصفية الصنايعية داخل صفحة الصنعة المختارة
  const professionCraftsmen = useMemo(() => {
    if (!selectedProfession) return [];
    return craftsmen.filter((item) =>
      doesCraftsmanMatchCategory(item, selectedProfession)
    );
  }, [craftsmen, selectedProfession, doesCraftsmanMatchCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDirectory();
    setRefreshing(false);
  };

  const handleWhatsApp = (phoneNum: string) => {
    const digits = phoneNum.replace(/[^0-9]/g, '');
    const intl = digits.startsWith('0') ? `2${digits}` : digits;
    Linking.openURL(`https://wa.me/${intl}`);
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* ١. صفحة الصنايعي التفصيلية عند اختيار صنايعي محدد */}
      {selectedCraftsman ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomTabPadding },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          canCancelContentTouches={true}
          directionalLockEnabled={false}
          overScrollMode="always">
          <View style={styles.detailBackRow}>
            <Pressable
              style={styles.cleanBackArrowBtn}
              onPress={() => setSelectedCraftsman(null)}>
              <Ionicons
                name="arrow-forward"
                size={24}
                color="#0F172A"
              />
            </Pressable>
            <Text style={styles.detailBackTitle}>
              {selectedProfession ? selectedProfession.name_ar : 'الملف المهني للصنايعي'}
            </Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileAvatarCircle}>
              <Ionicons name="person" size={34} color="#973c00" />
            </View>

            <View style={styles.profileNameAndNickRow}>
              <Text style={styles.profileName}>{selectedCraftsman.full_name}</Text>
              {selectedCraftsman.nickname ? (
                <Text style={styles.profileNickname}>({selectedCraftsman.nickname})</Text>
              ) : null}
            </View>

            <View style={styles.profileBadgesRow}>
              <View style={styles.specialtyPill}>
                <Ionicons name="construct-outline" size={14} color="#973c00" />
                <Text style={styles.specialtyPillText}>
                  {selectedCraftsman.specialty}
                </Text>
              </View>

              {selectedCraftsman.is_accredited ? (
                <View style={styles.accreditedPill}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={14}
                    color="#15803D"
                  />
                  <Text style={styles.accreditedPillText}>معتمد بالقرية</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <View style={styles.statValueRow}>
                  <Ionicons name="star" size={16} color="#D97706" />
                  <Text style={styles.statValue}>
                    {selectedCraftsman.average_rating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.statLabel}>
                  التقييم ({selectedCraftsman.ratings_count})
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <View style={styles.statValueRow}>
                  <Ionicons name="location-outline" size={16} color="#0F172A" />
                  <Text style={styles.statValue}>
                    {selectedCraftsman.area || 'المنشية'}
                  </Text>
                </View>
                <Text style={styles.statLabel}>المنطقة</Text>
              </View>
            </View>

            {selectedCraftsman.services_description ? (
              <View style={styles.descSection}>
                <Text style={styles.descSectionTitle}>الخدمات والأعمال</Text>
                <Text style={styles.descSectionBody}>
                  {selectedCraftsman.services_description}
                </Text>
              </View>
            ) : null}

            <View style={styles.profileActionsCol}>
              <Pressable
                style={styles.primaryCallBtn}
                onPress={() =>
                  Linking.openURL(`tel:${selectedCraftsman.phone}`)
                }>
                <Ionicons name="call-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryCallBtnText}>
                  اتصال مباشر ({selectedCraftsman.phone})
                </Text>
              </Pressable>

              <View style={styles.secondaryActionsRow}>
                <Pressable
                  style={styles.whatsappBtn}
                  onPress={() => handleWhatsApp(selectedCraftsman.phone)}>
                  <Ionicons name="logo-whatsapp" size={18} color="#15803D" />
                  <Text style={styles.whatsappBtnText}>مراسلة واتساب</Text>
                </Pressable>

                <Pressable
                  style={styles.rateProfileBtn}
                  onPress={() => setRatingTarget(selectedCraftsman)}>
                  <Ionicons name="star-outline" size={18} color="#973c00" />
                  <Text style={styles.rateProfileBtnText}>تقييم الصنايعي</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* معرض وسابقة أعمال الصنايعي */}
          <View style={styles.detailSectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="images-outline" size={20} color="#973c00" />
              <Text style={styles.detailSectionHeaderTitle}>معرض وسابقة الأعمال</Text>
            </View>
            <Text style={styles.detailSectionSubText}>
              نماذج موثقة من الأعمال والمشاريع التي نفذها الأسطى لأهالي القرية
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}>
              {getCraftsmanPortfolioList(selectedCraftsman).map((work) => (
                <Pressable
                  key={work.id}
                  style={styles.workCard}
                  onPress={() => setPreviewWorkImage(work.image_url)}>
                  <Image
                    source={{ uri: work.image_url }}
                    style={styles.workImage}
                    resizeMode="cover"
                  />
                  <View style={styles.workOverlay}>
                    <Text style={styles.workTitle} numberOfLines={1}>
                      {work.title}
                    </Text>
                    {work.description ? (
                      <Text style={styles.workDesc} numberOfLines={2}>
                        {work.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* آراء وتقييمات أهالي القرية */}
          <View style={styles.detailSectionCard}>
            <View style={styles.sectionHeaderBetween}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="chatbubbles-outline" size={20} color="#973c00" />
                <Text style={styles.detailSectionHeaderTitle}>آراء وتقييمات أهالي القرية</Text>
              </View>
              <Pressable
                style={styles.addReviewHeaderBtn}
                onPress={() => setRatingTarget(selectedCraftsman)}>
                <Ionicons name="star-outline" size={14} color="#973c00" />
                <Text style={styles.addReviewHeaderBtnText}>أضف رأيك</Text>
              </Pressable>
            </View>

            {loadingReviews ? (
              <View style={styles.reviewsLoadingBox}>
                <ActivityIndicator size="small" color="#973c00" />
                <Text style={styles.reviewsLoadingText}>جاري تحميل آراء أهالي القرية...</Text>
              </View>
            ) : craftsmanReviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {craftsmanReviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewItemCard}>
                    <View style={styles.reviewItemHeader}>
                      <View style={styles.reviewerInfo}>
                        <View style={styles.reviewerAvatar}>
                          <Ionicons name="person" size={14} color="#64748B" />
                        </View>
                        <Text style={styles.reviewerName}>
                          {rev.user_name || 'أحد أهالي القرية'}
                        </Text>
                      </View>
                      <View style={styles.reviewStarsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= rev.stars ? 'star' : 'star-outline'}
                            size={13}
                            color="#D97706"
                          />
                        ))}
                      </View>
                    </View>
                    {rev.comment ? (
                      <Text style={styles.reviewCommentText}>{rev.comment}</Text>
                    ) : (
                      <Text style={styles.reviewNoCommentText}>
                        قيّم الخدمة بـ {rev.stars} نجوم
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyReviewsBox}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={32}
                  color="#94A3B8"
                />
                <Text style={styles.emptyReviewsTitle}>لا توجد تعليقات مسجلة بعد</Text>
                <Text style={styles.emptyReviewsSub}>
                  كن أول من يشارك تجربته مع الأسطى {selectedCraftsman.full_name} لمساعدة جيرانك في المنشية.
                </Text>
                <Pressable
                  style={styles.firstReviewBtn}
                  onPress={() => setRatingTarget(selectedCraftsman)}>
                  <Ionicons name="star" size={15} color="#FFFFFF" />
                  <Text style={styles.firstReviewBtnText}>كتابة أول تقييم ورأي</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      ) : selectedProfession ? (
        /* ٢. صفحة الصنعة المختارة: هيدر حديث وراقي بثيم المنشية */
        <View style={styles.tabContainer}>
          <View style={styles.subPageFixedHeader}>
            <View style={styles.subPageHeaderRow}>
              {/* زر الرجوع الدائري الأنيق */}
              <Pressable
                style={styles.cleanBackArrowBtn}
                onPress={() => setSelectedProfession(null)}
                hitSlop={12}
                accessibilityLabel="رجوع لقائمة الصنائع">
                <Ionicons
                  name="arrow-forward"
                  size={22}
                  color="#0F172A"
                />
              </Pressable>

              {/* بادج أيقونة الصنعة */}
              <View style={styles.headerIconBadge}>
                <Ionicons
                  name={
                    (selectedProfession.icon_name ||
                      'construct-outline') as keyof typeof Ionicons.glyphMap
                  }
                  size={22}
                  color="#973c00"
                />
              </View>

              {/* عنوان المهنة وعدد الصنايعية والوصف */}
              <View style={styles.subPageTitleBlock}>
                <View style={styles.subPageTitleWithCountRow}>
                  <Text style={styles.subPageMainTitle}>
                    {selectedProfession.name_ar}
                  </Text>
                  <View style={styles.professionCountBadge}>
                    <Text style={styles.professionCountText}>
                      {professionCraftsmen.length} صنايعي
                    </Text>
                  </View>
                </View>
                <Text style={styles.subPageSubtitle}>
                  دليل الفنيين والحرفيين المعتمدين في القرية
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomTabPadding },
            ]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            canCancelContentTouches={true}
            directionalLockEnabled={false}
            overScrollMode="always">
            <WidgetErrorBoundary widgetNameAr="قائمة صنايعية الصنعة">
              {professionCraftsmen.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name={
                      (selectedProfession.icon_name ||
                        'construct-outline') as keyof typeof Ionicons.glyphMap
                    }
                    size={36}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyTitle}>
                    لا يوجد صنايعية مسجلون في «{selectedProfession.name_ar}» حالياً
                  </Text>
                  <Text style={styles.emptyDesc}>
                    سيتم إضافة وتحديث قائمة الحرفيين المعتمدين في هذه الصنعة قريباً من قبل إدارة القرية.
                  </Text>
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {professionCraftsmen.map((item) => (
                    <CraftsmanCard
                      key={item.id}
                      item={item}
                      onRatePress={setRatingTarget}
                      onPress={(c) => setSelectedCraftsman(c)}
                    />
                  ))}
                </View>
              )}
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      ) : (
        /* ٣. الصفحة الرئيسية للصنايعية: هيدر ثابت متطابق تماماً مع الخدمات والبلاغات */
        <View style={styles.tabContainer}>
          <View style={styles.fixedHeader}>
            <View style={styles.headerTitlesBox}>
              <Text style={styles.title}>الصنايعية</Text>
              <Text style={styles.headerSubtitle}>
                دليل الحرفيين والخدمات المنزلية بقرية المنشية
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomTabPadding },
            ]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            canCancelContentTouches={true}
            directionalLockEnabled={false}
            overScrollMode="always"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#973c00']}
                tintColor="#973c00"
              />
            }>

          <WidgetErrorBoundary widgetNameAr="جميع الوظائف والحرف">
            <View style={styles.grid}>
              {filteredCategories.map((cat) => {
                return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.gridItem,
                      pressed && styles.gridItemPressed,
                    ]}
                    onPress={() => {
                      setSelectedProfession(cat);
                    }}>
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name={
                          (cat.icon_name ||
                            'construct-outline') as keyof typeof Ionicons.glyphMap
                        }
                        size={22}
                        color="#973c00"
                      />
                    </View>
                    <Text style={styles.gridLabel} numberOfLines={1}>
                      {cat.name_ar}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </WidgetErrorBoundary>
        </ScrollView>
      </View>
      )}

      {/* موديول تقييم الصنايعي من الأسفل */}
      <RatingModal
        visible={!!ratingTarget}
        craftsman={ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSuccess={() => {
          loadDirectory();
          if (selectedCraftsman) {
            loadCraftsmanReviews(selectedCraftsman.id);
          }
        }}
      />

      {/* معاينة صورة العمل بالحجم الكامل */}
      <Modal
        visible={!!previewWorkImage}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setPreviewWorkImage(null)}>
        <Pressable
          style={styles.imageModalBackdrop}
          onPress={() => setPreviewWorkImage(null)}>
          <View style={styles.imageModalBox}>
            {previewWorkImage ? (
              <Image
                source={{ uri: previewWorkImage }}
                style={styles.imageModalFull}
                resizeMode="contain"
              />
            ) : null}
            <Pressable
              style={styles.imageModalCloseBtn}
              onPress={() => setPreviewWorkImage(null)}>
              <Ionicons name="close-circle" size={34} color="#FFFFFF" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FAF5EE' },
  tabContainer: { flex: 1, width: '100%' },
  fixedHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAF5EE',
    borderBottomWidth: 0,
    zIndex: 10,
  },
  headerTitlesBox: {
    gap: 2,
    flex: 1,
  },
  fixedSubHeaderBox: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 },
  cardsList: { gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  detailBackRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  detailBackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  subPageFixedHeader: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  subPageHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cleanBackArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageTitleBlock: {
    flex: 1,
    gap: 3,
  },
  subPageTitleWithCountRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  subPageMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  professionCountBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  professionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#973c00',
  },
  subPageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  searchBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  grid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  gridItem: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 94,
  },
  gridItemPressed: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
  },
  countBadge: {
    marginTop: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // ستايلات صفحة الصنايعي التفصيلية
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  profileAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileNameAndNickRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  profileNickname: {
    fontSize: 14,
    fontWeight: '700',
    color: '#973c00',
    textAlign: 'center',
  },
  profileBadgesRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  specialtyPill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  specialtyPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#973c00',
  },
  accreditedPill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  accreditedPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },
  statsRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  descSection: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  descSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  descSectionBody: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 21,
  },
  profileActionsCol: {
    width: '100%',
    gap: 10,
  },
  primaryCallBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    height: 48,
    borderRadius: 12,
  },
  primaryCallBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: rtlFlexDirection,
    gap: 10,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    height: 46,
    borderRadius: 12,
  },
  whatsappBtnText: {
    color: '#15803D',
    fontSize: 13.5,
    fontWeight: '700',
  },
  rateProfileBtn: {
    flex: 1,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    height: 46,
    borderRadius: 12,
  },
  rateProfileBtnText: {
    color: '#973c00',
    fontSize: 13.5,
    fontWeight: '700',
  },
  // كروت الأقسام في صفحة الصنايعي
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeaderBetween: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailSectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
  },
  detailSectionSubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    lineHeight: 18,
    marginBottom: 12,
  },
  // معرض وسابقة الأعمال
  portfolioScroll: {
    flexDirection: rtlFlexDirection,
    gap: 12,
    paddingVertical: 4,
  },
  workCard: {
    width: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#E2E8F0',
  },
  workOverlay: {
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  workTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    marginBottom: 2,
  },
  workDesc: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: rtlTextAlign,
    lineHeight: 16,
  },
  // زر إضافة رأي في الهيدر
  addReviewHeaderBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  addReviewHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  // التعليقات
  reviewsLoadingBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  reviewsLoadingText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  reviewsList: {
    gap: 10,
  },
  reviewItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewItemHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerInfo: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  reviewerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewStarsRow: {
    flexDirection: rtlFlexDirection,
    gap: 2,
  },
  reviewCommentText: {
    fontSize: 12.5,
    color: '#334155',
    textAlign: rtlTextAlign,
    lineHeight: 18,
  },
  reviewNoCommentText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: rtlTextAlign,
  },
  emptyReviewsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  emptyReviewsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyReviewsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  firstReviewBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  firstReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // معاينة الصورة بحجم كامل
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageModalBox: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageModalFull: {
    width: '100%',
    height: '100%',
  },
  imageModalCloseBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 6,
  },
  // ستايلات البوتوم شيت لإضافة صنايعي
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
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    gap: 10,
    elevation: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 13.5,
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#973c00',
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
