import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { PublicReportCard } from '../components/PublicReportCard';
import { PublicReportItem } from '../types/reports.types';

const NINE_REPORT_TYPES: {
  code: string;
  label: string;
  cleanName: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    code: 'sanitation',
    label: '١. النظافة',
    cleanName: 'النظافة',
    icon: 'trash-outline',
  },
  {
    code: 'sewage',
    label: '٢. الصرف الصحي',
    cleanName: 'الصرف الصحي',
    icon: 'water-outline',
  },
  {
    code: 'electricity',
    label: '٣. الكهرباء والإنارة',
    cleanName: 'الكهرباء والإنارة',
    icon: 'bulb-outline',
  },
  {
    code: 'roads',
    label: '٤. الطرق',
    cleanName: 'الطرق',
    icon: 'navigate-outline',
  },
  {
    code: 'water',
    label: '٥. المياه',
    cleanName: 'المياه',
    icon: 'rainy-outline',
  },
  {
    code: 'encroachments',
    label: '٦. الإشغالات',
    cleanName: 'الإشغالات',
    icon: 'alert-circle-outline',
  },
  {
    code: 'schools_facilities',
    label: '٧. المدارس والمرافق',
    cleanName: 'المدارس والمرافق',
    icon: 'school-outline',
  },
  {
    code: 'lost_and_found',
    label: '٨. المفقودات',
    cleanName: 'المفقودات',
    icon: 'search-outline',
  },
  {
    code: 'general',
    label: '٩. البلاغات العامة',
    cleanName: 'البلاغات العامة',
    icon: 'document-text-outline',
  },
];

interface ReportsOverviewResponse {
  public_reports: {
    id: string;
    report_number: number;
    report_type_ar: string;
    title: string;
    description: string;
    manual_address: string;
    status: PublicReportItem['status'];
    status_ar: string;
    resolution_summary?: string;
    created_at: string;
  }[];
}

export function ReportsScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const [reports, setReports] = useState<PublicReportItem[]>([]);
  const [selectedType, setSelectedType] = useState<{
    code: string;
    cleanName: string;
  }>({ code: 'electricity', cleanName: 'الكهرباء والإنارة' });
  const [showForm, setShowForm] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [reportImage, setReportImage] = useState<string | null>(null);

  const handlePickReportImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setReportImage(res.assets[0].uri);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر اختيار الصورة من المعرض');
    }
  };

  const loadReports = useCallback(async () => {
    const res = await fetchModuleData<ReportsOverviewResponse>(
      'reports',
      '/reports/public',
      {
        cooldownMs: 0,
        fallbackData: { public_reports: [] },
      }
    );
    const list = (res.data?.public_reports ?? []).map((r) => ({
      id: r.id,
      report_number: r.report_number,
      report_type_ar: r.report_type_ar,
      title: r.title,
      description: r.description,
      manual_address: r.manual_address,
      status: r.status,
      status_ar: r.status_ar,
      resolution_summary: r.resolution_summary,
      created_at_ar: new Date(r.created_at).toLocaleDateString('ar-EG'),
    }));
    setReports(list);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSubmitReport = async () => {
    if (!title.trim() || !address.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/reports/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: selectedType.code,
          report_type_ar: selectedType.cleanName,
          title: title.trim(),
          description:
            description.trim() || 'تم إرسال البلاغ للمشرف المختص للمراجعة.',
          manual_address: address.trim(),
          image_url: reportImage || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setTitle('');
        setDescription('');
        setAddress('');
        setReportImage(null);
        setShowForm(false);
        loadReports();
      }
    } catch {
      // ignore network error
    }
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomTabPadding },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>بلاغات ومشكلات القرية</Text>
            <Text style={styles.subtitle}>
              اختر نوع البلاغ ليتم تحويله تلقائياً إلى المشرف المختص
            </Text>
          </View>
          <Pressable
            style={styles.newReportBtn}
            onPress={() => setShowForm((prev) => !prev)}>
            <Ionicons
              name={showForm ? 'close-outline' : 'add-circle-outline'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.newReportBtnText}>
              {showForm ? 'إغلاق' : 'بلاغ جديد'}
            </Text>
          </Pressable>
        </View>

        <WidgetErrorBoundary widgetNameAr="أنواع البلاغات الـ 9">
          <View style={styles.typesWrap}>
            {NINE_REPORT_TYPES.map((typeItem) => {
              const isSelected = selectedType.cleanName === typeItem.cleanName;
              return (
                <Pressable
                  key={typeItem.label}
                  style={[
                    styles.typeChip,
                    isSelected && styles.typeChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedType({
                      code: typeItem.code,
                      cleanName: typeItem.cleanName,
                    });
                    setShowForm(true);
                  }}>
                  <Ionicons
                    name={typeItem.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : '#973c00'}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      isSelected && styles.typeChipTextSelected,
                    ]}>
                    {typeItem.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </WidgetErrorBoundary>

        {showForm ? (
          <WidgetErrorBoundary widgetNameAr="نموذج إرسال بلاغ جديد">
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                تقديم بلاغ جديد - قسم: {selectedType.cleanName}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="عنوان مختصر للمشكلة"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="العنوان اليدوي بالتفصيل داخل القرية"
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="وصف تفصيلي للمشكلة..."
                placeholderTextColor="#94A3B8"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              {/* إرفاق صورة للمشكلة أو العطل */}
              <Text style={styles.fieldLabel}>إرفاق صورة للمشكلة (اختياري):</Text>
              {reportImage ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: reportImage }} style={styles.formPreviewImage} />
                  <Pressable
                    style={styles.removeImageBtn}
                    onPress={() => setReportImage(null)}>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.removeImageText}>حذف الصورة</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.uploadDashedBox}
                  onPress={handlePickReportImage}>
                  <Ionicons name="camera-outline" size={24} color="#973c00" />
                  <Text style={styles.uploadDashedText}>
                    اضغط لالتقاط أو اختيار صورة من المعرض
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={styles.submitBtn}
                onPress={handleSubmitReport}>
                <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  حفظ وإرسال البلاغ للمشرف المختص
                </Text>
              </Pressable>
            </View>
          </WidgetErrorBoundary>
        ) : null}

        <WidgetErrorBoundary widgetNameAr="البلاغات العامة للقرية">
          <Text style={styles.sectionTitle}>
            متابعة البلاغات العامة ({reports.length})
          </Text>
          {reports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="megaphone-outline" size={34} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                لا توجد بلاغات مسجلة حالياً
              </Text>
              <Text style={styles.emptyDesc}>
                اضغط على أحد أنواع البلاغات الـ ٩ أعلاه أو زر «بلاغ جديد» لإرسال
                بلاغ حقيقي وحفظه على الخادم.
              </Text>
            </View>
          ) : (
            <View style={styles.reportsList}>
              {reports.map((rep) => <PublicReportCard key={rep.id} item={rep} />)}
            </View>
          )}
        </WidgetErrorBoundary>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 5 },
  reportsList: { gap: 12 },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  newReportBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#973c00',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  newReportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  typesWrap: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  typeChip: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  typeChipSelected: {
    backgroundColor: '#973c00',
    borderColor: '#973c00',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 18,
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0C4A6E',
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
    height: 76,
    paddingTop: 10,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginTop: 2,
  },
  uploadDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadDashedText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  imagePreviewWrap: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  formPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
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
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
});
