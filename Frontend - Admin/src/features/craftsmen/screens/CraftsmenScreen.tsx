import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  I18nManager,
  Linking,
  Modal,
  Platform,
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
import { rtlFlexDirection } from '@/core/theme/rtl';
import { API_BASE_URL } from '@/core/config/api.config';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { CraftsmanCard } from '../components/CraftsmanCard';
import { RatingModal } from '../components/RatingModal';
import {
  ALL_CRAFTSMEN_CATEGORIES,
  CraftsmanCategory,
  CraftsmanItem,
} from '../types/craftsmen.types';

interface CraftsmenDirectoryResponse {
  categories: CraftsmanCategory[];
  craftsmen: CraftsmanItem[];
}

export function CraftsmenScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();

  const [categories, setCategories] = useState<CraftsmanCategory[]>(
    ALL_CRAFTSMEN_CATEGORIES
  );
  const [craftsmen, setCraftsmen] = useState<CraftsmanItem[]>([]);

  // بحث في قائمة كل الوظائف (في الشاشة الرئيسية)
  const [jobSearchQuery, setJobSearchQuery] = useState<string>('');
  // الوظيفة/الصنعة المختارة لعرض صفحة الصنايعية الخاصة بها
  const [selectedProfession, setSelectedProfession] =
    useState<CraftsmanCategory | null>(null);
  // بحث داخل صفحة الصنعة المختارة
  const [craftsmanSearchQuery, setCraftsmanSearchQuery] = useState<string>('');
  // الصنايعي المختار لعرض صفحته التفصيلية الكاملة
  const [selectedCraftsman, setSelectedCraftsman] =
    useState<CraftsmanItem | null>(null);

  // نافذة إضافة صنايعي من الأسفل (Bottom Sheet)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  // نافذة التقييم من الأسفل (Bottom Sheet)
  const [ratingTarget, setRatingTarget] = useState<CraftsmanItem | null>(null);

  const [fullName, setFullName] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [servicesDesc, setServicesDesc] = useState<string>('');

  const loadDirectory = useCallback(async () => {
    const res = await fetchModuleData<CraftsmenDirectoryResponse>(
      'craftsmen',
      '/craftsmen/',
      {
        cooldownMs: 0,
        fallbackData: {
          categories: ALL_CRAFTSMEN_CATEGORIES,
          craftsmen: [],
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

  // دعم زر الرجوع في الهاتف للعودة من صفحة الصنايعي -> صفحة الصنعة -> كل الوظائف
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedCraftsman) {
        setSelectedCraftsman(null);
        return true;
      }
      if (selectedProfession) {
        setSelectedProfession(null);
        setCraftsmanSearchQuery('');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedCraftsman, selectedProfession]);

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
  const filteredCategories = useMemo(() => {
    const q = jobSearchQuery.trim();
    if (!q) return categories;
    return categories.filter((cat) => cat.name_ar.includes(q));
  }, [categories, jobSearchQuery]);

  // تصفية الصنايعية داخل صفحة الصنعة المختارة
  const professionCraftsmen = useMemo(() => {
    if (!selectedProfession) return [];
    const q = craftsmanSearchQuery.trim();
    return craftsmen.filter((item) => {
      const inCategory = doesCraftsmanMatchCategory(item, selectedProfession);
      if (!inCategory) return false;
      if (!q) return true;
      return (
        item.full_name.includes(q) ||
        item.nickname.includes(q) ||
        item.area.includes(q) ||
        item.services_description.includes(q)
      );
    });
  }, [craftsmen, selectedProfession, craftsmanSearchQuery, doesCraftsmanMatchCategory]);

  const openAddModalForProfession = (prof?: CraftsmanCategory | null) => {
    setSpecialty(prof ? prof.name_ar : '');
    setShowAddModal(true);
  };

  const handleAddCraftsman = async () => {
    const targetSpecialty =
      specialty.trim() || selectedProfession?.name_ar || '';
    if (!fullName.trim() || !targetSpecialty || !phone.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/craftsmen/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          nickname: nickname.trim(),
          specialty: targetSpecialty,
          phone: phone.trim(),
          area: area.trim() || 'المنشية',
          services_description: servicesDesc.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setFullName('');
        setNickname('');
        setSpecialty('');
        setPhone('');
        setArea('');
        setServicesDesc('');
        setShowAddModal(false);
        loadDirectory();
      }
    } catch {
      // ignore network error
    }
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
          showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeader}>
            <Pressable
              style={styles.backBtn}
              onPress={() => setSelectedCraftsman(null)}>
              <Ionicons
                name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color="#0F172A"
              />
              <Text style={styles.backBtnText}>
                {selectedProfession ? selectedProfession.name_ar : 'الرجوع'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileAvatarCircle}>
              <Ionicons name="person" size={34} color="#973c00" />
            </View>

            <Text style={styles.profileName}>{selectedCraftsman.full_name}</Text>
            {selectedCraftsman.nickname ? (
              <Text style={styles.profileNickname}>
                {selectedCraftsman.nickname}
              </Text>
            ) : null}

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
        </ScrollView>
      ) : selectedProfession ? (
        /* ٢. صفحة الصنعة المختارة: تعرض كل الصنايعية في هذه الوظيفة */
        <ScrollView
          contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomTabPadding },
        ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeader}>
            <Pressable
              style={styles.backBtn}
              onPress={() => {
                setSelectedProfession(null);
                setCraftsmanSearchQuery('');
              }}>
              <Ionicons
                name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color="#0F172A"
              />
              <Text style={styles.backBtnText}>كل الوظائف</Text>
            </Pressable>

            <Pressable
              style={styles.addBtn}
              onPress={() => openAddModalForProfession(selectedProfession)}>
              <Ionicons name="person-add-outline" size={15} color="#FFFFFF" />
              <Text style={styles.addBtnText}>إضافة صنايعي</Text>
            </Pressable>
          </View>

          <View style={styles.professionBanner}>
            <View style={styles.professionBannerIcon}>
              <Ionicons
                name={
                  (selectedProfession.icon_name ||
                    'construct-outline') as keyof typeof Ionicons.glyphMap
                }
                size={26}
                color="#973c00"
              />
            </View>
            <View style={styles.professionBannerTextCol}>
              <Text style={styles.professionBannerTitle}>
                {selectedProfession.name_ar}
              </Text>
              <Text style={styles.professionBannerSub}>
                عدد الصنايعية المسجلين في هذه الصنعة: {professionCraftsmen.length}
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder={`ابحث عن صنايعي في ${selectedProfession.name_ar}...`}
              placeholderTextColor="#94A3B8"
              value={craftsmanSearchQuery}
              onChangeText={setCraftsmanSearchQuery}
            />
            {craftsmanSearchQuery ? (
              <Pressable onPress={() => setCraftsmanSearchQuery('')}>
                <Ionicons name="close-circle-outline" size={18} color="#64748B" />
              </Pressable>
            ) : null}
          </View>

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
                  يمكنك إضافة صنايعي في هذه الصنعة ليظهر لجميع أهالي القرية.
                </Text>
                <Pressable
                  style={styles.emptyAddBtn}
                  onPress={() => openAddModalForProfession(selectedProfession)}>
                  <Ionicons name="add-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyAddBtnText}>
                    إضافة صنايعي في {selectedProfession.name_ar}
                  </Text>
                </Pressable>
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
      ) : (
        /* ٣. الصفحة الرئيسية للصنايعية: تعرض كل الوظائف والصنعات في القرية */
        <ScrollView
          contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomTabPadding },
        ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.topHeader}>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>الصنايعية وأصحاب الحرف</Text>
              <Text style={styles.subtitle}>
                اختر الصنعة أو الوظيفة لعرض الصنايعية المتخصصين بها
              </Text>
            </View>
            <Pressable
              style={styles.addBtn}
              onPress={() => openAddModalForProfession(null)}>
              <Ionicons name="person-add-outline" size={15} color="#FFFFFF" />
              <Text style={styles.addBtnText}>إضافة صنايعي</Text>
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن الصنعة أو الوظيفة (كهرباء، سباكة، نجارة...)"
              placeholderTextColor="#94A3B8"
              value={jobSearchQuery}
              onChangeText={setJobSearchQuery}
            />
            {jobSearchQuery ? (
              <Pressable onPress={() => setJobSearchQuery('')}>
                <Ionicons name="close-circle-outline" size={18} color="#64748B" />
              </Pressable>
            ) : null}
          </View>

          <WidgetErrorBoundary widgetNameAr="جميع الوظائف والحرف">
            <View style={styles.grid}>
              {filteredCategories.map((cat) => {
                const count = countByProfession[cat.id] || 0;
                return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.gridItem,
                      pressed && styles.gridItemPressed,
                    ]}
                    onPress={() => {
                      setSelectedProfession(cat);
                      setCraftsmanSearchQuery('');
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
                    <Text style={styles.gridLabel} numberOfLines={2}>
                      {cat.name_ar}
                    </Text>
                    {count > 0 ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{count}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </WidgetErrorBoundary>
        </ScrollView>
      )}

      {/* موديول إضافة صنايعي من الأسفل بدون تعتيم وبدون عنوان أو زر إغلاق */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.bottomSheetBox} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <TextInput
              style={styles.input}
              placeholder="الاسم الثلاثي للصنايعي"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="اللقب أو اسم الشهرة"
              placeholderTextColor="#94A3B8"
              value={nickname}
              onChangeText={setNickname}
            />
            <TextInput
              style={styles.input}
              placeholder="الصنعة / الوظيفة (مثال: كهرباء منازل)"
              placeholderTextColor="#94A3B8"
              value={specialty}
              onChangeText={setSpecialty}
            />
            <TextInput
              style={styles.input}
              placeholder="رقم الموبايل للتواصل"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="المنطقة داخل القرية"
              placeholderTextColor="#94A3B8"
              value={area}
              onChangeText={setArea}
            />
            <TextInput
              style={styles.input}
              placeholder="وصف الخدمات والأعمال التي يقدمها"
              placeholderTextColor="#94A3B8"
              value={servicesDesc}
              onChangeText={setServicesDesc}
            />
            <Pressable style={styles.submitBtn} onPress={handleAddCraftsman}>
              <Text style={styles.submitBtnText}>حفظ بيانات الصنايعي</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* موديول تقييم الصنايعي من الأسفل */}
      <RatingModal
        visible={!!ratingTarget}
        craftsman={ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSuccess={loadDirectory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 5 },
  cardsList: { gap: 12 },
  topHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#973c00',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  subPageHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  professionBanner: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  professionBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionBannerTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  professionBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    width: '100%',
  },
  professionBannerSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
    width: '100%',
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
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    textAlign: 'right',
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
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 102,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 17,
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
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  profileNickname: {
    fontSize: 14,
    fontWeight: '600',
    color: '#973c00',
    marginTop: 2,
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
    textAlign: 'right',
    marginBottom: 6,
  },
  descSectionBody: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'right',
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
  // ستايلات البوتوم شيت لإضافة صنايعي
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 28 : 38,
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
