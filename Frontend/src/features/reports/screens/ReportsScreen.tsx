import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
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
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { API_BASE_URL } from '@/core/config/api.config';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { notifyNotificationsListeners } from '@/features/notifications/api/notifications.api';
import { PublicReportCard } from '../components/PublicReportCard';
import {
  ReportTrackingModal,
  ReportTrackingModalData,
} from '../components/ReportTrackingModal';
import { PublicReportItem } from '../types/reports.types';
import { SEED_TEN_REPORTS } from '../data/reports.mock';
import { addMyReport } from '../storage/myReportsStorage';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import { uploadMediaToDrive } from '@/core/storage/driveUpload';

const NINE_REPORT_TYPES: {
  code: string;
  cleanName: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    code: 'sanitation',
    cleanName: 'النظافة والقمامة',
    desc: 'تراكم المخلفات، حاويات القمامة',
    icon: 'trash-outline',
  },
  {
    code: 'sewage',
    cleanName: 'الصرف الصحي',
    desc: 'انسداد البيارات، طفح المياه، أغطية البالوعات',
    icon: 'water-outline',
  },
  {
    code: 'electricity',
    cleanName: 'الكهرباء والإنارة',
    desc: 'أعمدة الإنارة، كابلات مكشوفة، انقطاع التيار',
    icon: 'bulb-outline',
  },
  {
    code: 'roads',
    cleanName: 'الطرق والتمهيد',
    desc: 'هبوط أرضي، حفر الأسفلت، عوائق السير',
    icon: 'navigate-outline',
  },
  {
    code: 'water',
    cleanName: 'مياه الشرب',
    desc: 'كسر مواسير، ضعف ضخ المياه، تلوث',
    icon: 'rainy-outline',
  },
  {
    code: 'encroachments',
    cleanName: 'الإشغالات والتعديات',
    desc: 'إشغال الطريق العام، بناء بدون ترخيص',
    icon: 'alert-circle-outline',
  },
  {
    code: 'schools_facilities',
    cleanName: 'المدارس والمرافق',
    desc: 'الوحدات الصحية، المدارس، مراكز الشباب',
    icon: 'school-outline',
  },
  {
    code: 'lost_and_found',
    cleanName: 'المفقودات والأمانات',
    desc: 'أشياء مفقودة أو معثور عليها بالقرية',
    icon: 'search-outline',
  },
  {
    code: 'general',
    cleanName: 'البلاغات العامة',
    desc: 'أي مشكلات أو مقترحات عامة أخرى',
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
    image_url?: string;
    status: PublicReportItem['status'];
    status_ar: string;
    resolution_summary?: string;
    created_at: string;
  }[];
}

interface MediaAttachment {
  id: string;
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
}

export function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const [currentView, setCurrentView] = useState<'list' | 'create'>('list');
  const [reports, setReports] = useState<PublicReportItem[]>(SEED_TEN_REPORTS);
  const [selectedType, setSelectedType] = useState<{
    code: string;
    cleanName: string;
    icon: keyof typeof Ionicons.glyphMap;
  }>({
    code: 'electricity',
    cleanName: 'الكهرباء والإنارة',
    icon: 'bulb-outline',
  });
  const [showCategorySheet, setShowCategorySheet] = useState<boolean>(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState<boolean>(false);
  const [submittedReportNumber, setSubmittedReportNumber] = useState<number | null>(null);
  const [trackingReport, setTrackingReport] = useState<ReportTrackingModalData | null>(null);

  // ترتيب البلاغات تنازلياً من الأحدث للأقدم
  const sortedReports = useMemo(() => {
    return [...reports].sort(
      (a, b) => (b.report_number || 0) - (a.report_number || 0)
    );
  }, [reports]);

  const handleOpenTracking = (rep: PublicReportItem) => {
    setTrackingReport({
      id: rep.id,
      reportNumber: rep.report_number,
      typeAr: rep.report_type_ar,
      title: rep.title,
      address: rep.manual_address,
      status: rep.status,
      statusAr: rep.status_ar,
      createdAtAr: rep.created_at_ar,
      resolutionSummary: rep.resolution_summary,
    });
  };

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [mediaList, setMediaList] = useState<MediaAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // دعم زر الرجوع بهواتف أندرويد للرجوع خطوة واحدة دائماً
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (trackingReport) {
          setTrackingReport(null);
          return true;
        }
        if (showCategorySheet) {
          setShowCategorySheet(false);
          return true;
        }
        if (showSuccessSheet) {
          setShowSuccessSheet(false);
          return true;
        }
        if (currentView === 'create') {
          setCurrentView('list');
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [currentView, showCategorySheet, showSuccessSheet, trackingReport])
  );

  // زر صغير لاختيار مرفق (صورة أو فيديو من المعرض)
  const handlePickAnyMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newItems: MediaAttachment[] = res.assets.map((asset, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          fileName: asset.fileName ?? undefined,
        }));
        setMediaList((prev) => [...prev, ...newItems]);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر اختيار المرفقات من المعرض');
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList((prev) => prev.filter((item) => item.id !== id));
  };

  const loadReports = useCallback(async () => {
    const res = await fetchModuleData<ReportsOverviewResponse>(
      'reports',
      '/reports/public',
      {
        cooldownMs: 0,
        fallbackData: { public_reports: SEED_TEN_REPORTS as any },
      }
    );
    if (res.data?.public_reports && res.data.public_reports.length > 0) {
      const list = res.data.public_reports.map((r) => ({
        id: r.id,
        report_number: r.report_number,
        report_type_ar: r.report_type_ar,
        title: r.title,
        description: r.description,
        manual_address: r.manual_address,
        image_url: r.image_url,
        status: r.status,
        status_ar: r.status_ar,
        resolution_summary: r.resolution_summary,
        created_at_ar: new Date(r.created_at).toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      }));
      setReports(list);
    } else {
      setReports(SEED_TEN_REPORTS);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSubmitReport = async () => {
    if (!title.trim() || !address.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة عنوان المشكلة والمكان بالتفصيل داخل القرية.');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const cleanTitle = title.trim();
    const cleanAddress = address.trim();
    const cleanDesc = description.trim() || 'تم إرسال البلاغ للمشرف المختص للمراجعة والمتابعة.';
    const userKey = user?.phone || user?.id || 'guest';
    const fingerprint = await getCompositeDeviceFingerprint().catch(() => '');

    let uploadedMediaUrl: string | undefined;
    if (mediaList.length > 0) {
      try {
        const uploadedUrls = await Promise.all(
          mediaList.map((item) =>
            uploadMediaToDrive({
              uri: item.uri,
              section: 'reports',
              mediaType: item.type,
              fileName: item.fileName,
            })
          )
        );
        const firstImageIdx = mediaList.findIndex((m) => m.type === 'image');
        uploadedMediaUrl =
          firstImageIdx >= 0 ? uploadedUrls[firstImageIdx] : uploadedUrls[0];
      } catch (err: any) {
        setIsSubmitting(false);
        Alert.alert(
          'تعذر رفع المرفق إلى Google Drive',
          err?.message || 'تحقق من اتصال الإنترنت ثم أعد المحاولة.'
        );
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/reports/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || '',
          user_phone: user?.phone || '',
          user_name: user?.full_name || '',
          device_fingerprint: fingerprint,
          report_type: selectedType.code,
          report_type_ar: selectedType.cleanName,
          title: cleanTitle,
          description: cleanDesc,
          manual_address: cleanAddress,
          image_url: uploadedMediaUrl,
        }),
      });

      const json = await res.json().catch(() => null);
      const repNum = json?.data?.report_number || reports.length + 1;
      const repId = json?.data?.id || `my-rep-${Date.now()}`;

      // حفظ البلاغ في قائمة "بلاغاتي" المخصصة للمواطن نفسه فقط
      await addMyReport(
        {
          id: repId,
          reportNumber: repNum,
          typeAr: selectedType.cleanName,
          title: cleanTitle,
          address: cleanAddress,
          status: 'pending_approval',
          statusAr: 'قيد مراجعة المشرف',
          createdAtAr: 'الآن',
        },
        userKey
      );

      setSubmittedReportNumber(repNum);
      setTitle('');
      setDescription('');
      setAddress('');
      setMediaList([]);
      setCurrentView('list');
      setShowSuccessSheet(true);
      // إعادة تحميل البلاغات المعتمدة فقط (البلاغ الجديد لا يظهر حتى يوافق عليه المشرف)
      await loadReports();
    } catch {
      const repNum = reports.length + 1;
      const repId = `my-rep-${Date.now()}`;

      // حفظ البلاغ محلياً للمواطن حتى في حالة تعذر الاتصال
      await addMyReport(
        {
          id: repId,
          reportNumber: repNum,
          typeAr: selectedType.cleanName,
          title: cleanTitle,
          address: cleanAddress,
          status: 'pending_approval',
          statusAr: 'قيد مراجعة المشرف',
          createdAtAr: 'الآن',
        },
        userKey
      );

      setSubmittedReportNumber(repNum);
      setTitle('');
      setDescription('');
      setAddress('');
      setMediaList([]);
      setCurrentView('list');
      setShowSuccessSheet(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ========================================================
     ١. صفحة تقديم بلاغ جديد
     ======================================================== */
  if (currentView === 'create') {
    return (
      <View style={[styles.screenContainer, { paddingTop: topInset }]}>
        {/* هيدر الصفحة: شفاف وبدون أي باجراوند */}
        <View style={styles.cleanHeaderTransparent}>
          <View style={styles.cleanHeaderRow}>
            <Pressable
              style={styles.cleanBackArrowBtn}
              onPress={() => setCurrentView('list')}
              hitSlop={12}>
              <Ionicons name="arrow-forward" size={26} color="#0F172A" />
            </Pressable>

            <View style={styles.headerTitlesCol}>
              <Text style={styles.createMainHeading}>تقديم بلاغ جديد</Text>
              <Text style={styles.createSubHeading}>
                سيتم تحويل بلاغك مباشرة للمشرف المختص بالقرية
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.formBodyScroll}
          contentContainerStyle={[
            styles.formBodyContent,
            { paddingBottom: bottomTabPadding + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          canCancelContentTouches={true}
          directionalLockEnabled={false}
          overScrollMode="always"
          showsVerticalScrollIndicator={false}>

          {/* كارت النموذج المتكامل والمدمج */}
          <View style={styles.sectionCard}>
            {/* ١. عنوان المشكلة */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                عنوان المشكلة <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.modernInput}
                placeholder="مثال: انقطاع مياه الشرب، عمود إنارة مطفأ"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* ٢. المكان بالتفصيل */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                المكان بالتفصيل داخل القرية <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.modernInput}
                placeholder="مثال: بجوار مسجد النور - شارع المحطة"
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* ٣. فئة البلاغ: في سطر أنيق متطابق مع حقول الإدخال تحت المكان بالتفصيل */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                فئة البلاغ <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Pressable
                style={styles.categoryInputSelector}
                onPress={() => setShowCategorySheet(true)}>
                <View style={styles.categoryInputContentRow}>
                  <View style={styles.categoryInputIconWrap}>
                    <Ionicons
                      name={selectedType.icon}
                      size={18}
                      color="#973c00"
                    />
                  </View>
                  <Text style={styles.categoryInputText}>
                    {selectedType.cleanName}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#94A3B8" />
              </Pressable>
            </View>

            {/* ٤. تفاصيل ووصف البلاغ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>تفاصيل ووصف البلاغ</Text>
              <TextInput
                style={[styles.modernInput, styles.modernTextArea]}
                placeholder="اشرح المشكلة بالتفصيل لتسهيل وتسيير المعاينة..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* المرفقات: زر صغير لاختيار صورة أو فيديو */}
            <View style={styles.compactAttachSection}>
              <View style={styles.compactAttachHeaderRow}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="attach-outline" size={17} color="#973c00" />
                  <Text style={styles.inputLabel}>
                    المرفقات {mediaList.length > 0 ? `(${mediaList.length})` : '(اختياري)'}
                  </Text>
                </View>

                {/* زر صغير لإضافة مرفق (صورة أو فيديو) */}
                <Pressable
                  style={styles.compactAddMediaBtn}
                  onPress={handlePickAnyMedia}>
                  <Ionicons name="add-circle-outline" size={16} color="#973c00" />
                  <Text style={styles.compactAddMediaBtnText}>
                    إضافة صورة أو فيديو
                  </Text>
                </Pressable>
              </View>

              {/* معرض المرفقات المختارة */}
              {mediaList.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaThumbScroll}>
                  {mediaList.map((item) => (
                    <View key={item.id} style={styles.mediaThumbCard}>
                      {item.type === 'image' ? (
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.mediaThumbImg}
                        />
                      ) : (
                        <View style={styles.videoCardPlaceholder}>
                          <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                          <Text style={styles.videoCardLabel}>فيديو</Text>
                        </View>
                      )}

                      <View
                        style={[
                          styles.mediaTypeBadge,
                          item.type === 'video'
                            ? styles.videoTypeBadge
                            : styles.imageTypeBadge,
                        ]}>
                        <Text style={styles.mediaTypeBadgeText}>
                          {item.type === 'video' ? 'فيديو' : 'صورة'}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.deleteMediaCircle}
                        onPress={() => handleRemoveMedia(item.id)}
                        hitSlop={8}>
                        <Ionicons name="close" size={13} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>

          {/* أزرار الإجراءات بالأسفل */}
          <View style={styles.formFooterActions}>
            {/* زر الإرسال الرئيسي */}
            <Pressable
              style={[
                styles.primarySubmitBtn,
                isSubmitting && styles.primarySubmitBtnDisabled,
              ]}
              disabled={isSubmitting}
              onPress={handleSubmitReport}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.primarySubmitBtnText}>
                {isSubmitting ? 'جاري إرسال البلاغ للمشرف...' : 'إرسال البلاغ للمشرف المختص'}
              </Text>
            </Pressable>

            {/* زر إلغاء والعودة للبلاغات: بارز وواضح كزرار صريح */}
            <Pressable
              style={styles.clearCancelBtn}
              onPress={() => setCurrentView('list')}>
              <Ionicons name="arrow-back" size={18} color="#334155" />
              <Text style={styles.clearCancelBtnText}>إلغاء والعودة للبلاغات</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* ========================================================
           موديول اختيار الفئة من الأسفل (Bottom Sheet Modal)
           ======================================================== */}
        <Modal
          visible={showCategorySheet}
          animationType="slide"
          transparent
          statusBarTranslucent
          onRequestClose={() => setShowCategorySheet(false)}>
          <View style={styles.bottomSheetBackdrop}>
            <Pressable
              style={styles.backdropPressArea}
              onPress={() => setShowCategorySheet(false)}
            />
            <View style={styles.bottomSheetContainer}>
              <View style={styles.dragBarWrap}>
                <View style={styles.dragBar} />
              </View>

              <View style={styles.sheetTopRow}>
                <Text style={styles.sheetMainTitle}>اختر فئة البلاغ</Text>
                <Pressable
                  style={styles.sheetCloseBtn}
                  onPress={() => setShowCategorySheet(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </Pressable>
              </View>

              <ScrollView
                style={styles.sheetListScroll}
                contentContainerStyle={styles.sheetListContent}
                showsVerticalScrollIndicator={false}>
                {NINE_REPORT_TYPES.map((typeItem) => {
                  const isSelected = selectedType.cleanName === typeItem.cleanName;
                  return (
                    <Pressable
                      key={typeItem.code}
                      style={[
                        styles.sheetCategoryItem,
                        isSelected && styles.sheetCategoryItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedType({
                          code: typeItem.code,
                          cleanName: typeItem.cleanName,
                          icon: typeItem.icon,
                        });
                        setShowCategorySheet(false);
                      }}>
                      <View style={styles.sheetItemRightCol}>
                        <View
                          style={[
                            styles.sheetIconCircle,
                            isSelected && styles.sheetIconCircleSelected,
                          ]}>
                          <Ionicons
                            name={typeItem.icon}
                            size={20}
                            color={isSelected ? '#FFFFFF' : '#973c00'}
                          />
                        </View>
                        <View style={styles.sheetItemTexts}>
                          <Text
                            style={[
                              styles.sheetItemTitle,
                              isSelected && styles.sheetItemTitleSelected,
                            ]}>
                            {typeItem.cleanName}
                          </Text>
                          <Text style={styles.sheetItemDesc}>
                            {typeItem.desc}
                          </Text>
                        </View>
                      </View>

                      {isSelected ? (
                        <View style={styles.sheetCheckCircle}>
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        </View>
                      ) : (
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color="#CBD5E1"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ========================================================
           موديول نجاح الإرسال للمشرف المسؤول من الأسفل (Bottom Sheet)
           ======================================================== */}
        <Modal
          visible={showSuccessSheet}
          animationType="slide"
          transparent
          statusBarTranslucent
          onRequestClose={() => setShowSuccessSheet(false)}>
          <View style={styles.bottomSheetBackdrop}>
            <Pressable
              style={styles.backdropPressArea}
              onPress={() => setShowSuccessSheet(false)}
            />
            <View style={styles.successSheetContainer}>
              <View style={styles.dragBarWrap}>
                <View style={styles.dragBar} />
              </View>

              <View style={styles.successContentBox}>
                <View style={styles.successIconOuterCircle}>
                  <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                </View>

                <Text style={styles.successSheetHeading}>
                  تم استلام البلاغ بنجاح
                </Text>
                <Text style={styles.successSheetSubtext}>
                  تم تحويل البلاغ للمشرف المسؤول للمراجعة والاعتماد الميداني. لن يُنشر البلاغ في الدليل العام للقرية إلا بعد موافقة المشرف المختص.
                </Text>

                {submittedReportNumber ? (
                  <View style={styles.reportNumberPill}>
                    <Ionicons name="document-text-outline" size={16} color="#973c00" />
                    <Text style={styles.reportNumberPillText}>
                      رقم البلاغ للمتابعة: #{submittedReportNumber}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.reviewStatusBadge}>
                  <Ionicons name="time-outline" size={15} color="#D97706" />
                  <Text style={styles.reviewStatusBadgeText}>
                    الحالة: قيد مراجعة واعتماد المشرف
                  </Text>
                </View>

                <Pressable
                  style={styles.successDoneBtn}
                  onPress={() => {
                    setShowSuccessSheet(false);
                    router.push('/profile');
                  }}>
                  <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.successDoneBtnText}>عرض ومتابعة بلاغاتي في حسابي</Text>
                </Pressable>

                <Pressable
                  style={styles.successSecondaryBtn}
                  onPress={() => setShowSuccessSheet(false)}>
                  <Text style={styles.successSecondaryBtnText}>البقاء في صفحة البلاغات</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  /* ========================================================
     ٢. صفحة البلاغات الرئيسية (قائمة البلاغات مع هيدر ثابت)
     ======================================================== */
  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* هيدر الصفحة الرئيسي الثابت (Fixed Sticky Header) */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerTitlesBox}>
          <Text style={styles.title}>البلاغات</Text>
          <Text style={styles.headerSubtitle}>متابعة البلاغات والخدمات الميدانية</Text>
        </View>
        <Pressable
          style={styles.headerAddIconBtn}
          onPress={() => setCurrentView('create')}
          accessibilityLabel="إضافة بلاغ جديد"
          hitSlop={8}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
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
        {/* قائمة البلاغات العامة (10 بلاغات) */}
        <WidgetErrorBoundary widgetNameAr="البلاغات العامة للقرية">
          {sortedReports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="megaphone-outline" size={34} color="#94A3B8" />
              <Text style={styles.emptyTitle}>لا توجد بلاغات مسجلة حالياً</Text>
              <Text style={styles.emptyDesc}>
                اضغط على زر «إضافة بلاغ» للإبلاغ عن مشكلة في قريتك لمتابعتها من قبل المشرف المختص.
              </Text>
            </View>
          ) : (
            <View style={styles.reportsList}>
              {sortedReports.map((rep) => (
                <PublicReportCard
                  key={rep.id}
                  item={rep}
                  onPress={handleOpenTracking}
                />
              ))}
            </View>
          )}
        </WidgetErrorBoundary>
      </ScrollView>

      {/* موديول تأكيد الإرسال عند العودة للقائمة */}
      <Modal
        visible={showSuccessSheet}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowSuccessSheet(false)}>
        <View style={styles.bottomSheetBackdrop}>
          <Pressable
            style={styles.backdropPressArea}
            onPress={() => setShowSuccessSheet(false)}
          />
          <View style={styles.successSheetContainer}>
            <View style={styles.dragBarWrap}>
              <View style={styles.dragBar} />
            </View>

            <View style={styles.successContentBox}>
              <View style={styles.successIconOuterCircle}>
                <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
              </View>

              <Text style={styles.successSheetHeading}>
                تم استلام البلاغ بنجاح
              </Text>
              <Text style={styles.successSheetSubtext}>
                تم تحويل البلاغ للمشرف المسؤول للمراجعة والاعتماد الميداني. لن يُنشر البلاغ في الدليل العام للقرية إلا بعد موافقة المشرف المختص.
              </Text>

              {submittedReportNumber ? (
                <View style={styles.reportNumberPill}>
                  <Ionicons name="document-text-outline" size={16} color="#973c00" />
                  <Text style={styles.reportNumberPillText}>
                    رقم البلاغ للمتابعة: #{submittedReportNumber}
                  </Text>
                </View>
              ) : null}

              <View style={styles.reviewStatusBadge}>
                <Ionicons name="time-outline" size={15} color="#D97706" />
                <Text style={styles.reviewStatusBadgeText}>
                  الحالة: قيد مراجعة واعتماد المشرف
                </Text>
              </View>

              <Pressable
                style={styles.successDoneBtn}
                onPress={() => {
                  setShowSuccessSheet(false);
                  router.push('/profile');
                }}>
                <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                <Text style={styles.successDoneBtnText}>عرض ومتابعة بلاغاتي في حسابي</Text>
              </Pressable>

              <Pressable
                style={styles.successSecondaryBtn}
                onPress={() => setShowSuccessSheet(false)}>
                <Text style={styles.successSecondaryBtnText}>البقاء في صفحة البلاغات</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* موديولا متابعة مراحل البلاغ بارتفاع تفاعلي سلس (١/٤ إلى ٣/٤) */}
      <ReportTrackingModal
        visible={!!trackingReport}
        report={trackingReport}
        onClose={() => setTrackingReport(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FAF5EE' },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 5 },
  reportsList: { gap: 14 },
  fixedHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    zIndex: 10,
  },
  headerTitlesBox: {
    gap: 2,
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
  headerAddIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
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

  /* ========================================================
     هيدر صفحة تقديم البلاغ: شفاف وبدون أي باجراوند
     ======================================================== */
  cleanHeaderTransparent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  cleanHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  cleanBackArrowBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitlesCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  createMainHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  createSubHeading: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },

  /* جسم الصفحة */
  formBodyScroll: {
    flex: 1,
  },
  formBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 14,
  },

  /* كارت النموذج المتكامل */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
  },

  /* سطر اختيار الفئة المتطابق مع حقول الإدخال */
  fieldLabelRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  categoryInputSelector: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  categoryInputContentRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
  },
  categoryInputIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInputText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },

  /* حقول الإدخال */
  fieldGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '700',
  },
  modernInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13.5,
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  modernTextArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  /* قسم المرفقات المضغوط الصغير */
  compactAttachSection: {
    gap: 10,
    paddingTop: 4,
  },
  compactAttachHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactAddMediaBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  compactAddMediaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },

  /* معرض المرفقات */
  mediaThumbScroll: {
    flexDirection: rtlFlexDirection,
    gap: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  mediaThumbCard: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mediaThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoCardPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  videoCardLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageTypeBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  videoTypeBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.9)',
  },
  mediaTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
  },
  deleteMediaCircle: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* أزرار الإجراءات بالأسفل */
  formFooterActions: {
    gap: 10,
    marginTop: 4,
  },
  primarySubmitBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primarySubmitBtnDisabled: {
    opacity: 0.65,
  },
  primarySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  clearCancelBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  clearCancelBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ========================================================
     موديول الفئات من الأسفل (Bottom Sheet)
     ======================================================== */
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  dragBarWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  sheetTopRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetMainTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetListScroll: {
    paddingHorizontal: 16,
  },
  sheetListContent: {
    paddingVertical: 10,
    gap: 8,
  },
  sheetCategoryItem: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#F1F5F9',
  },
  sheetCategoryItemSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#973c00',
  },
  sheetItemRightCol: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sheetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetIconCircleSelected: {
    backgroundColor: '#973c00',
    borderColor: '#973c00',
  },
  sheetItemTexts: {
    flex: 1,
    alignItems: 'stretch',
  },
  sheetItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  sheetItemTitleSelected: {
    color: '#973c00',
  },
  sheetItemDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  sheetCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ========================================================
     موديول نجاح الإرسال للمشرف (Bottom Sheet)
     ======================================================== */
  successSheetContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  successContentBox: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 10,
  },
  successIconOuterCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successSheetHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSheetSubtext: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
  },
  reportNumberPill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 4,
  },
  reportNumberPillText: {
    color: '#973c00',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewStatusBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  reviewStatusBadgeText: {
    color: '#B45309',
    fontSize: 12.5,
    fontWeight: '700',
  },
  successDoneBtn: {
    width: '100%',
    backgroundColor: '#973c00',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: rtlFlexDirection,
    gap: 8,
  },
  successDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successSecondaryBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  successSecondaryBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
