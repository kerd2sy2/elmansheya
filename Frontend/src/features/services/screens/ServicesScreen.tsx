import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
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
import { fetchModuleData } from '@/core/api-client/apiClient';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ServiceCategoryGridCard } from '../components/ServiceCategoryGridCard';
import {
  ServiceCategoryItem,
  ServiceDetailItem,
} from '../types/services.types';

const NINE_SERVICE_CATEGORIES: ServiceCategoryItem[] = [
  {
    id: '1',
    slug: 'events',
    name_ar: 'المناسبات',
    icon: 'calendar-outline',
    description: 'الأفراح، العزاء، والندوات مع الموقع على الخريطة',
  },
  {
    id: '2',
    slug: 'humanitarian',
    name_ar: 'الحالات الإنسانية',
    icon: 'heart-outline',
    description: 'الحالات الموثقة وبيانات التبرعات والجهة المسؤولة',
  },
  {
    id: '3',
    slug: 'healthcare',
    name_ar: 'الصحة والطوارئ والصيدليات',
    icon: 'medkit-outline',
    description: 'الوحدة الصحية، الإسعاف، الأطباء، والصيدليات المناوبة',
  },
  {
    id: '4',
    slug: 'village_issues',
    name_ar: 'خدمات ومشاكل القرية',
    icon: 'megaphone-outline',
    description: 'تقديم ومتابعة بلاغات ومشكلات القرية',
  },
  {
    id: '5',
    slug: 'transportation',
    name_ar: 'المواصلات والسيارات',
    icon: 'car-outline',
    description: 'مواقف السيارات، خطوط السير، وأرقام التواصل',
  },
  {
    id: '6',
    slug: 'education',
    name_ar: 'المدارس والتعليم',
    icon: 'school-outline',
    description: 'المدارس، المعاهد الأزهرية، والحضانات بالقرية',
  },
  {
    id: '7',
    slug: 'mosques_charities',
    name_ar: 'المساجد والجمعيات',
    icon: 'home-outline',
    description: 'المساجد، الجمعيات الخيرية، ومكاتب تحفيظ القرآن',
  },
  {
    id: '8',
    slug: 'gov_offices',
    name_ar: 'المصالح الحكومية والبريد',
    icon: 'business-outline',
    description: 'مكتب البريد، التموين، الوحدة المحلية، والجمعية الزراعية',
  },
  {
    id: '9',
    slug: 'shops_markets',
    name_ar: 'المحلات والأسواق',
    icon: 'cart-outline',
    description: 'المخابز، الصيدليات، والمحلات الخدمية بالقرية',
  },
];

export function ServicesScreen() {
  const router = useRouter();
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategoryItem | null>(null);
  const [items, setItems] = useState<ServiceDetailItem[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  const loadCategoryItems = useCallback(async (slug: string) => {
    setLoadingItems(true);
    const res = await fetchModuleData<ServiceDetailItem[]>(
      'services',
      `/services/items?slug=${slug}`,
      {
        cooldownMs: 0,
        fallbackData: [],
      }
    );
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryItems(selectedCategory.slug);
    } else {
      setItems([]);
    }
  }, [selectedCategory, loadCategoryItems]);

  // دعم زر الرجوع الفيزيائي في أندرويد: الرجوع من القسم للشبكة أولاً قبل الرجوع للصفحة السابقة
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedCategory) {
          setSelectedCategory(null);
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [selectedCategory])
  );

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {selectedCategory ? (
        /* ٢. صفحة القسم الخدمي المختار بالكامل مع سهم رجوع نظيف ومحاذاة يمين كاملة */
        <View style={styles.tabContainer}>
          <View style={styles.subPageFixedHeader}>
            <View style={styles.subPageHeaderRow}>
              {/* سهم الرجوع النظيف بدون أي خلفية */}
              <Pressable
                style={styles.cleanBackArrowBtn}
                onPress={() => setSelectedCategory(null)}
                hitSlop={12}
                accessibilityLabel="رجوع لجميع أقسام الخدمات">
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color="#0F172A"
                />
              </Pressable>

              {/* عنوان القسم مع الأيقونة بجانبه مباشرة بمحاذاة اليمين */}
              <View style={styles.subPageTitleBlock}>
                <Ionicons
                  name={
                    (selectedCategory.icon ||
                      'grid-outline') as keyof typeof Ionicons.glyphMap
                  }
                  size={22}
                  color="#973c00"
                />
                <Text style={styles.subPageMainTitle}>
                  {selectedCategory.name_ar}
                </Text>
              </View>
            </View>
            <Text style={styles.subPageDesc}>{selectedCategory.description}</Text>
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
            <WidgetErrorBoundary widgetNameAr="تفاصيل الخدمات المسجلة">
              <View style={styles.detailsHeaderRow}>
                <Text style={styles.detailsTitle}>
                  الجهات والخدمات المسجلة ({items.length})
                </Text>
              </View>

              {loadingItems ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#973c00" />
                  <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
                </View>
              ) : !Array.isArray(items) || items.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="folder-open-outline" size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    لا توجد خدمات مسجلة بعد في «{selectedCategory.name_ar}»
                  </Text>
                  <Text style={styles.emptyDesc}>
                    سيتم إضافة الأماكن والخدمات ومواعيد العمل وأرقام التواصل تباعاً لخدمة أهالي القرية.
                  </Text>
                </View>
              ) : (
                <View style={styles.itemsList}>
                  {items.map((it) => (
                    <View key={it.id} style={styles.itemCard}>
                      <Text style={styles.itemTitle}>{it.title}</Text>
                      {it.description ? (
                        <Text style={styles.itemDesc}>{it.description}</Text>
                      ) : null}

                      {it.phone ? (
                        <Pressable
                          style={styles.callRow}
                          onPress={() => Linking.openURL(`tel:${it.phone}`)}>
                          <Ionicons name="call-outline" size={14} color="#973c00" />
                          <Text style={styles.phoneText}>اتصال: {it.phone}</Text>
                        </Pressable>
                      ) : null}

                      {it.working_hours ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.metaText}>المواعيد: {it.working_hours}</Text>
                        </View>
                      ) : null}

                      {it.address ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={14} color="#64748B" />
                          <Text style={styles.metaText}>المكان: {it.address}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      ) : (
        /* ١. الصفحة الرئيسية للخدمات: هيدر موحد وشبكة الـ ٩ أقسام فقط */
        <View style={styles.tabContainer}>
          <View style={styles.fixedHeader}>
            <View style={styles.headerTitlesBox}>
              <Text style={styles.title}>الخدمات</Text>
              <Text style={styles.headerSubtitle}>
                ٩ أقسام رئيسية لتصفح الخدمات ومواعيد العمل والأماكن بالقرية
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
            overScrollMode="always">
            <WidgetErrorBoundary widgetNameAr="شبكة الخدمات الـ 9">
              <View style={styles.grid}>
                {NINE_SERVICE_CATEGORIES.map((cat) => (
                  <ServiceCategoryGridCard
                    key={cat.id}
                    item={cat}
                    isSelected={false}
                    onPress={() => {
                      if (cat.slug === 'village_issues') {
                        router.push('/reports');
                        return;
                      }
                      setSelectedCategory(cat);
                    }}
                  />
                ))}
              </View>
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FAF5EE' },
  tabContainer: { flex: 1, width: '100%' },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 },
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
  subPageFixedHeader: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E9DA',
  },
  subPageHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
  },
  cleanBackArrowBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageTitleBlock: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subPageMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  subPageDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginRight: 48,
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: rtlTextAlign,
  },
  grid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsHeaderRow: {
    marginBottom: 12,
    marginTop: 4,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'stretch',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    width: '100%',
  },
  itemDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 8,
    width: '100%',
  },
  callRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  phoneText: {
    fontSize: 12,
    color: '#973c00',
    fontWeight: '700',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  metaRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
