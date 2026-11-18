import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeBottomTabPadding, useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useAuth } from '@/features/auth/context/AuthContext';
import { canAccessSection } from '@/core/permissions/adminRoles';
import { API_BASE_URL } from '@/core/config/api.config';

interface CraftCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CRAFTS_CATEGORIES: CraftCategory[] = [
  { id: 'cat-electricity', title: 'كهربائي منازل', icon: 'flash' },
  { id: 'cat-plumbing', title: 'سباك صحي', icon: 'water' },
  { id: 'cat-carpentry', title: 'نجار وأثاث', icon: 'hammer' },
  { id: 'cat-painting', title: 'نقاش وتشطيبات', icon: 'color-palette' },
  { id: 'cat-ac', title: 'تكييف وتبريد', icon: 'snow' },
  { id: 'cat-builder', title: 'بناء وسيراميك', icon: 'cube' },
  { id: 'cat-appliances', title: 'صيانة أجهزة منزلية', icon: 'hardware-chip' },
];

interface CraftsmanItem {
  id: string;
  full_name: string;
  category_id: string;
  phone: string;
  experience_years: number;
  is_verified: boolean;
  bio?: string;
}

export function CraftsmenManagementScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user, token } = useAuth();

  const [selectedCat, setSelectedCat] = useState('cat-electricity');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [craftsmenList, setCraftsmenList] = useState<CraftsmanItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const hasPermission = canAccessSection(user?.role, 'craftsmen');

  const fetchCraftsmen = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE_URL}/craftsmen/`);
      const json = await res.json();
      if (res.ok && json.data?.craftsmen) {
        setCraftsmenList(json.data.craftsmen);
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchCraftsmen();
  }, []);

  if (!hasPermission) {
    return (
      <View style={[styles.unauthorizedBox, { paddingTop: topInset + 40 }]}>
        <Ionicons name="lock-closed-outline" size={48} color="#DC2626" />
        <Text style={styles.unauthorizedTitle}>غير مصرح لك بإدارة دليل الصنايعية</Text>
        <Text style={styles.unauthorizedDesc}>
          هذا القسم مخصص حصرياً لـ «المشرف العام» و«مساعد دليل الصنايعية».
        </Text>
      </View>
    );
  }

  const handleRegisterCraftsman = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('بيانات مطلوبة', 'يرجى إدخال اسم الفني ورقم هاتفه.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/craftsmen/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: selectedCat,
          full_name: name.trim(),
          phone: phone.trim(),
          experience_years: parseInt(experienceYears, 10) || 1,
          bio: bio.trim(),
          is_verified: true,
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (res.ok && json.success) {
        Alert.alert('✅ تم الاعتماد بنجاح', `تم توثيق الصنايعي «${name.trim()}» ونشره في تطبيق المواطنين.`);
        setName('');
        setPhone('');
        setBio('');
        fetchCraftsmen();
      } else {
        Alert.alert('خطأ', json?.error?.message ?? 'تعذر تسجيل الفني.');
      }
    } catch {
      setLoading(false);
      Alert.alert('خطأ في الاتصال', 'تعذر الاتصال بالخادم، تأكد من تشغيل الشبكة.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset + 12, paddingBottom: bottomTabPadding + 50 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* الترويسة العليا */}
        <View style={styles.headerBox}>
          <View style={styles.roleBadge}>
            <Ionicons name="construct" size={14} color="#973c00" />
            <Text style={styles.roleBadgeText}>قطاع واعتماد الصنايعية والحرفيين</Text>
          </View>
          <Text style={styles.screenTitle}>إدارة وتوثيق صنايعية القرية</Text>
          <Text style={styles.screenDesc}>
            اعتماد مهنيي المنشية، منح شارة التوثيق الذهبية، وإتاحة أرقامهم لأهالي القرية فوراً.
          </Text>
        </View>

        {/* نموذج إضافة صنايعي معتمد جديد */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>➕ تسجيل واعتماد صنايعي جديد</Text>
          <View style={styles.cardDivider} />

          <Text style={styles.fieldLabel}>التخصص الحرفي:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            {CRAFTS_CATEGORIES.map((c) => {
              const isSelected = selectedCat === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedCat(c.id)}>
                  <Ionicons
                    name={c.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : '#973c00'}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {c.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>اسم الفني أو الصنايعي الثلاثي *</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: الأسطى إبراهيم حسن..."
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            textAlign="right"
          />

          <Text style={styles.fieldLabel}>رقم هاتف الاتصال والواتساب *</Text>
          <TextInput
            style={styles.input}
            placeholder="010XXXXXXXX"
            keyboardType="phone-pad"
            placeholderTextColor="#94A3B8"
            value={phone}
            onChangeText={setPhone}
            textAlign="left"
          />

          <Text style={styles.fieldLabel}>سنوات الخبرة</Text>
          <TextInput
            style={styles.input}
            placeholder="5"
            keyboardType="number-pad"
            placeholderTextColor="#94A3B8"
            value={experienceYears}
            onChangeText={setExperienceYears}
            textAlign="left"
          />

          <Text style={styles.fieldLabel}>وصف مختصر والمنطقة داخل القرية</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="مثال: خبرة في تأسيس وصيانة شبكات السباكة بالمنشية البحرية..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={bio}
            onChangeText={setBio}
            textAlign="right"
          />

          <View style={styles.verifiedNotice}>
            <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
            <Text style={styles.verifiedNoticeText}>
              سيتم نشر الصنايعي مباشرة بشارة «موثق ومعتمد من إدارة القرية».
            </Text>
          </View>

          <Pressable
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handleRegisterCraftsman}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>اعتماد وتوثيق الفني الآن</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* قائمة الصنايعية المسجلين حالياً */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>دليل الفنيين المعتمدين بالقرية</Text>
          <Pressable onPress={fetchCraftsmen} style={styles.refreshListBtn}>
            <Ionicons name="refresh" size={16} color="#64748B" />
          </Pressable>
        </View>

        {loadingList ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#973c00" />
            <Text style={styles.loadingText}>جاري استرجاع دليل الحرفيين...</Text>
          </View>
        ) : (
          <View style={styles.craftsmenGrid}>
            {craftsmenList.map((item) => (
              <View key={item.id} style={styles.craftsmanCard}>
                <View style={styles.craftsmanHeader}>
                  <View style={styles.craftsmanAvatar}>
                    <Text style={styles.craftsmanInitials}>
                      {item.full_name?.slice(0, 2) || 'فن'}
                    </Text>
                  </View>
                  <View style={styles.craftsmanTexts}>
                    <View style={styles.nameRow}>
                      <Text style={styles.craftsmanName}>{item.full_name}</Text>
                      {item.is_verified && (
                        <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                      )}
                    </View>
                    <Text style={styles.craftsmanPhone}>{item.phone}</Text>
                  </View>
                </View>

                {item.bio ? (
                  <Text style={styles.craftsmanBio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                ) : null}

                <View style={styles.craftsmanFooter}>
                  <View style={styles.expBadge}>
                    <Text style={styles.expBadgeText}>خبرة {item.experience_years} سنوات</Text>
                  </View>
                  <View style={styles.verifiedTag}>
                    <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                    <Text style={styles.verifiedTagText}>معتمد رسمي</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  unauthorizedBox: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 14,
    textAlign: 'center',
  },
  unauthorizedDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  headerBox: {
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  roleBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
  },
  screenDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: rtlFlexDirection,
    gap: 8,
    paddingBottom: 10,
  },
  chip: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  chipActive: {
    backgroundColor: '#973c00',
    borderColor: '#973c00',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13.5,
    color: '#0F172A',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  verifiedNotice: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  verifiedNoticeText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'right',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: '#973c00',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  listHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshListBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  craftsmenGrid: {
    gap: 10,
  },
  craftsmanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  craftsmanHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  craftsmanAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  craftsmanInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#973c00',
  },
  craftsmanTexts: {
    flex: 1,
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  craftsmanName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  craftsmanPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  craftsmanBio: {
    fontSize: 11.5,
    color: '#475569',
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 16,
  },
  craftsmanFooter: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  expBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  verifiedTag: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
});
