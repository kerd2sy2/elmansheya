import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
    useState<ServiceCategoryItem>(NINE_SERVICE_CATEGORIES[0]);
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
    loadCategoryItems(selectedCategory.slug);
  }, [selectedCategory.slug, loadCategoryItems]);

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
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
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>خدماتي</Text>
            <Text style={styles.subtitle}>
              ٩ أقسام رئيسية لتصفح الخدمات ومواعيد العمل والأماكن بالقرية
            </Text>
          </View>
        </View>

        <WidgetErrorBoundary widgetNameAr="شبكة الخدمات الـ 9">
          <View style={styles.grid}>
            {NINE_SERVICE_CATEGORIES.map((cat) => (
              <ServiceCategoryGridCard
                key={cat.id}
                item={cat}
                isSelected={selectedCategory.slug === cat.slug}
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

        <WidgetErrorBoundary widgetNameAr="تفاصيل الخدمات المسجلة">
          <View style={styles.detailsHeaderRow}>
            <Text style={styles.detailsTitle}>
              الجهات والخدمات في «{selectedCategory.name_ar}» ({items.length})
            </Text>
          </View>

          {loadingItems ? (
            <ActivityIndicator size="small" color="#973c00" />
          ) : !Array.isArray(items) || items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>لا توجد خدمات مسجلة بعد في هذا القسم</Text>
              <Text style={styles.emptyDesc}>
                اضغط على زر «إضافة خدمة» أعلاه لإضافة أول جهة أو موعد في هذا
                القسم، وسيتم حفظها بشكل دائم على الخادم.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {items.map((it) => (
                <View key={it.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{it.title}</Text>
                  <Text style={styles.itemDesc}>{it.description}</Text>

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
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FAF5EE' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 5 },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reportsBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  reportsBannerRight: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reportsIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reportsTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  reportsTitleRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  reportsBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  liveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  liveBadgeText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '700',
  },
  reportsBannerDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  reportsBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerTextCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    width: '100%',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    width: '100%',
  },
  addBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#973c00',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderColor: '#FED7AA',
    marginBottom: 16,
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
  },
  textArea: {
    height: 70,
    paddingTop: 10,
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
  grid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsHeaderRow: {
    marginBottom: 10,
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
