import React, { useState } from 'react';
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

interface BranchDef {
  slug: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const SERVICE_BRANCHES: BranchDef[] = [
  { slug: 'events', label: 'المناسبات والأفراح والعزاء', icon: 'balloon', color: '#973c00' },
  { slug: 'humanitarian', label: 'الحالات الإنسانية والتكافل', icon: 'heart', color: '#DC2626' },
  { slug: 'healthcare', label: 'الصحة والطوارئ والأطباء', icon: 'medkit', color: '#16A34A' },
  { slug: 'village_issues', label: 'مشاكل القرية والمرافق', icon: 'warning', color: '#D97706' },
  { slug: 'transportation', label: 'المواصلات وخطوط السير', icon: 'bus', color: '#2563EB' },
  { slug: 'education', label: 'المدارس والتعليم والمكتبات', icon: 'school', color: '#4F46E5' },
  { slug: 'mosques_charities', label: 'المساجد والدروس والجمعيات', icon: 'business', color: '#059669' },
  { slug: 'gov_offices', label: 'المصالح الحكومية والبريد', icon: 'mail', color: '#0284C7' },
  { slug: 'shops_markets', label: 'المحلات والأنشطة والأسواق', icon: 'cart', color: '#7C3AED' },
];

export function ServicesManagementScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user, token } = useAuth();

  const [selectedSlug, setSelectedSlug] = useState('healthcare');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const hasPermission = canAccessSection(user?.role, 'services');

  if (!hasPermission) {
    return (
      <View style={[styles.unauthorizedBox, { paddingTop: topInset + 40 }]}>
        <Ionicons name="lock-closed-outline" size={48} color="#DC2626" />
        <Text style={styles.unauthorizedTitle}>غير مصرح لك بإدارة الخدمات</Text>
        <Text style={styles.unauthorizedDesc}>
          هذا القسم مخصص للمشرفين المعتمدين والمشرف العام.
        </Text>
      </View>
    );
  }

  const activeBranch = SERVICE_BRANCHES.find((b) => b.slug === selectedSlug) || SERVICE_BRANCHES[0];

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('بيانات مطلوبة', 'يرجى كتابة عنوان الخدمة وتفاصيلها.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/create-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_slug: selectedSlug,
          title: title.trim(),
          description: description.trim(),
          phone: phone.trim(),
          working_hours: workingHours.trim(),
          address: address.trim(),
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (res.ok && json.success) {
        Alert.alert('✅ تم الحفظ بنجاح', `تمت إضافة الخدمة إلى فرع «${activeBranch.label}» بدليل القرية.`);
        setTitle('');
        setDescription('');
        setPhone('');
        setWorkingHours('');
        setAddress('');
      } else {
        Alert.alert('خطأ', json?.error?.message ?? 'تعذر حفظ الخدمة.');
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
        {/* ترويسة الشاشة */}
        <View style={styles.headerBox}>
          <View style={styles.roleBadge}>
            <Ionicons name="grid" size={14} color="#973c00" />
            <Text style={styles.roleBadgeText}>إدارة الفروع الخدمية التسعة</Text>
          </View>
          <Text style={styles.screenTitle}>إضافة وتحديث خدمات القرية</Text>
          <Text style={styles.screenDesc}>
            يتم تحديث المواعيد، الأطباء، ومشاكل القرية مباشرة في تطبيق المواطنين فور الحفظ.
          </Text>
        </View>

        {/* اختيار الفرع الخدمي */}
        <Text style={styles.sectionLabel}>اختر فرع الخدمة (٩ فروع):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {SERVICE_BRANCHES.map((b) => {
            const isSelected = selectedSlug === b.slug;
            return (
              <Pressable
                key={b.slug}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: b.color, borderColor: b.color },
                ]}
                onPress={() => setSelectedSlug(b.slug)}>
                <Ionicons
                  name={b.icon}
                  size={15}
                  color={isSelected ? '#FFFFFF' : b.color}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {b.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* نموذج الإدخال */}
        <View style={styles.card}>
          <View style={styles.formHeaderRow}>
            <View style={[styles.branchIconBadge, { backgroundColor: `${activeBranch.color}15` }]}>
              <Ionicons name={activeBranch.icon} size={20} color={activeBranch.color} />
            </View>
            <View style={styles.branchHeaderTexts}>
              <Text style={styles.branchHeaderTitle}>{activeBranch.label}</Text>
              <Text style={styles.branchHeaderSub}>إضافة خدمة أو إعلان رسمي جديد</Text>
            </View>
          </View>

          <View style={styles.formDivider} />

          <Text style={styles.fieldLabel}>اسم الخدمة أو الإعلان أو المرفق *</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: د. أحمد الشناوي (استشاري باطنة)، أو سيارة إسعاف المنشية..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />

          <Text style={styles.fieldLabel}>تفاصيل الخدمة والتخصص والمواعيد *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب التخصص، الإرشادات، أوقات التواجد، أو تفاصيل الحالة بالتفصيل..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlign="right"
          />

          <Text style={styles.fieldLabel}>رقم هاتف التواصل والخط الساخن</Text>
          <TextInput
            style={styles.input}
            placeholder="010XXXXXXXX أو رقم أرضي"
            keyboardType="phone-pad"
            placeholderTextColor="#94A3B8"
            value={phone}
            onChangeText={setPhone}
            textAlign="left"
          />

          <Text style={styles.fieldLabel}>مواعيد العمل أو النوبتجية (اختياري)</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: طوال ٢٤ ساعة يومياً، أو السبت والثلاثاء ٥-٩ م"
            placeholderTextColor="#94A3B8"
            value={workingHours}
            onChangeText={setWorkingHours}
            textAlign="right"
          />

          <Text style={styles.fieldLabel}>العنوان أو الموقع داخل القرية (اختياري)</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: شارع الوحدة الصحية أمام صيدلية الشعب"
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={setAddress}
            textAlign="right"
          />

          <Pressable
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handleCreate}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>حفظ وتعميم الخدمة في تطبيق المواطن</Text>
              </>
            )}
          </Pressable>
        </View>
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
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: rtlFlexDirection,
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
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
  formHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  branchIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchHeaderTexts: {
    flex: 1,
    alignItems: 'flex-start',
  },
  branchHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  branchHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  formDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 8,
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
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
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
});
