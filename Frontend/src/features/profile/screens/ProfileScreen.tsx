import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  I18nManager,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { useAuth } from '@/features/auth/context/AuthContext';
import { changeUserPassword } from '@/features/auth/api/auth.api';
import * as Haptics from 'expo-haptics';
import { API_BASE_URL } from '@/core/config/api.config';
import { uploadMediaToDrive } from '@/core/storage/driveUpload';
import { getDirectImageUrl } from '@/core/utils/googleDrive';
import { VerificationModal } from '../components/VerificationModal';
import { ReportTrackingModal } from '@/features/reports/components/ReportTrackingModal';
import {
  getMyReports,
  saveUserReports,
  MyReportItem,
  TimelineStep,
  generateTimelineSteps,
} from '@/features/reports/storage/myReportsStorage';
import {
  getAutoPlayOnWifiSetting,
  setAutoPlayOnWifiSetting,
} from '@/core/storage/videoSettingsStorage';

export function ProfileScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const router = useRouter();
  const {
    user,
    logout,
    updateProfile,
    toggleBiometric,
  } = useAuth();

  const scrollY = useRef(new Animated.Value(0)).current;

  // نوافذ البوتوم شيت المنبثقة من الأسفل
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
  const [showChangePhotoSheet, setShowChangePhotoSheet] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState<boolean>(false);
  const [showPendingModal, setShowPendingModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showChangePasswordSheet, setShowChangePasswordSheet] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);

  const keyboardOffset = useSmoothKeyboardOffset(Platform.OS === 'android' ? 14 : 0);

  const [selectedReportForTracking, setSelectedReportForTracking] = useState<MyReportItem | null>(null);
  const [myReports, setMyReports] = useState<MyReportItem[]>([]);
  const [showMyReportsPage, setShowMyReportsPage] = useState<boolean>(false);
  const [autoPlayOnWifi, setAutoPlayOnWifi] = useState<boolean>(true);

  useEffect(() => {
    getAutoPlayOnWifiSetting().then(setAutoPlayOnWifi);
  }, []);

  const handleToggleAutoPlayOnWifi = async (val: boolean) => {
    setAutoPlayOnWifi(val);
    await setAutoPlayOnWifiSetting(val);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // إدارة زر الرجوع الفيزيائي: الرجوع خطوة واحدة دائماً إلى شاشة الملف الشخصي
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedReportForTracking) {
          setSelectedReportForTracking(null);
          return true;
        }
        if (showFullImageModal) {
          setShowFullImageModal(false);
          return true;
        }
        if (showChangePhotoSheet) {
          setShowChangePhotoSheet(false);
          return true;
        }
        if (showChangePasswordSheet) {
          setShowChangePasswordSheet(false);
          return true;
        }
        if (showEditModal) {
          setShowEditModal(false);
          return true;
        }
        if (showVerificationModal) {
          setShowVerificationModal(false);
          return true;
        }
        if (showVerifiedModal) {
          setShowVerifiedModal(false);
          return true;
        }
        if (showPendingModal) {
          setShowPendingModal(false);
          return true;
        }
        if (showMyReportsPage) {
          setShowMyReportsPage(false);
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [
      showMyReportsPage,
      selectedReportForTracking,
      showFullImageModal,
      showChangePhotoSheet,
      showChangePasswordSheet,
      showEditModal,
      showVerificationModal,
      showVerifiedModal,
      showPendingModal,
    ])
  );

  const loadUserReports = useCallback(async () => {
    if (!user || (!user.phone && !user.id)) {
      setMyReports([]);
      return;
    }

    const userKey = user.phone || user.id;

    // ١. قراءة بلاغات هذا المواطن المحددة من التخزين المعزول محلياً فوراً (0ms بدون إنترنت)
    try {
      const local = await getMyReports(userKey);
      if (local && Array.isArray(local)) {
        setMyReports(local);
      }
    } catch {}

    // ٢. جلب أحدث البلاغات الحقيقية لهذا المواطن حصراً من السيرفر
    try {
      const queryParam = user.phone ? `phone=${encodeURIComponent(user.phone)}` : `user_id=${encodeURIComponent(user.id)}`;
      const res = await fetch(`${API_BASE_URL}/reports/my-reports?${queryParam}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const serverList = Array.isArray(json?.data) ? json.data : [];

        const mapped: MyReportItem[] = serverList.map((r: any) => ({
          id: r.id || `rep-${r.report_number}`,
          reportNumber: r.report_number || 0,
          typeAr: r.report_type_ar || 'بلاغ عام',
          title: r.title,
          address: r.manual_address || '',
          status: r.status,
          statusAr: r.status_ar || 'قيد المتابعة',
          createdAtAr: r.created_at
            ? new Date(r.created_at).toLocaleDateString('ar-EG', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'الآن',
          resolutionSummary: r.resolution_summary,
          steps: generateTimelineSteps(
            r.status,
            r.created_at
              ? new Date(r.created_at).toLocaleDateString('ar-EG', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'الآن',
            r.resolution_summary
          ),
        }));

        // دمج البلاغات مع المحفوظات المحلية لنفس المستخدم ومنع أي تكرار
        const local = await getMyReports(userKey);
        const map = new Map<string, MyReportItem>();
        mapped.forEach((rep) => map.set(String(rep.reportNumber || rep.id), rep));
        local.forEach((rep) => {
          const key = String(rep.reportNumber || rep.id);
          if (!map.has(key)) {
            map.set(key, rep);
          }
        });

        const finalReports = Array.from(map.values()).sort(
          (a, b) => (b.reportNumber || 0) - (a.reportNumber || 0)
        );

        setMyReports(finalReports);
        await saveUserReports(finalReports, userKey);
      }
    } catch {
      // وضع الأوفلاين: تظل البلاغات المحلية المحفوظة لهذا المستخدم معروضة بسلاسة
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUserReports();
    }, [loadUserReports])
  );

  const [editName, setEditName] = useState<string>(user?.full_name ?? '');
  const [editArea, setEditArea] = useState<string>(user?.area ?? '');

  if (!user) {
    return null;
  }

  // الحروف الأولى للاسم لعرضها في الدائرة
  const initials = useMemo(() => {
    const parts = user.full_name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`;
    }
    return user.full_name.slice(0, 2);
  }, [user.full_name]);

  const uploadAndSaveAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      const driveUrl = await uploadMediaToDrive({
        uri: asset.uri,
        section: 'profile',
        mediaType: 'image',
        fileName: asset.fileName ?? undefined,
        base64: asset.base64,
      });
      updateProfile({ avatar_url: driveUrl });
    } catch (err: any) {
      Alert.alert(
        'تعذر رفع الصورة',
        err?.message || 'تعذر حفظ الصورة الشخصية على Google Drive، يرجى المحاولة مجدداً.'
      );
    }
  };

  // التقاط صورة بالكاميرا مباشرة دون شاشة قص
  const handleTakePhoto = async () => {
    setShowChangePhotoSheet(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'برجاء منح الإذن للوصول إلى الكاميرا لالتقاط الصورة');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await uploadAndSaveAvatar(res.assets[0]);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر التقاط الصورة عبر الكاميرا');
    }
  };

  // اختيار صورة من المعرض مباشرة دون شاشة قص
  const handlePickFromGallery = async () => {
    setShowChangePhotoSheet(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await uploadAndSaveAvatar(res.assets[0]);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر اختيار الصورة من المعرض');
    }
  };

  // حذف الصورة الشخصية الحالية
  const handleRemovePhoto = () => {
    setShowChangePhotoSheet(false);
    updateProfile({ avatar_url: '' });
  };

  // تفعيل أو إلغاء البصمة مع اشتراط التحقق بالبصمة أولاً
  const handleToggleBiometric = async (nextValue: boolean) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'البصمة غير متوفرة',
          'جهازك لا يدعم التحقق البيومتري أو لم يتم تسجيل بصمة في إعدادات الهاتف.'
        );
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: nextValue
          ? 'يرجى تأكيد بصمتك لتفعيل الدخول بالبصمة'
          : 'يرجى تأكيد بصمتك لإلغاء تفعيل الدخول بالبصمة',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
        fallbackLabel: 'استخدام كلمة المرور',
      });

      if (authResult.success) {
        toggleBiometric(nextValue);
      } else {
        if (
          authResult.error !== 'user_cancel' &&
          authResult.error !== 'system_cancel'
        ) {
          Alert.alert(
            'فشل التحقق',
            'لم نتمكن من التحقق من البصمة. تم الإبقاء على الإعداد الحالي.'
          );
        }
      }
    } catch {
      Alert.alert('خطأ', 'حدث خطأ أثناء فحص البصمة.');
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('تنبيه', 'برجاء كتابة الاسم الكامل');
      return;
    }
    updateProfile({ full_name: editName, area: editArea });
    setShowEditModal(false);
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setPasswordError('يرجى إدخال كلمة السر الجديدة.');
      return;
    }
    if (cleanNew.length < 6) {
      setPasswordError('يجب ألا تقل كلمة السر عن ٦ خانات.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPasswordError('كلمتا السر غير متطابقتين، يرجى كتابتهما بدقة.');
      return;
    }

    setPasswordSubmitting(true);
    const res = await changeUserPassword(user.phone, cleanNew);
    setPasswordSubmitting(false);

    if (!res.ok) {
      setPasswordError(res.error || 'تعذر تغيير كلمة السر حالياً.');
      return;
    }

    setPasswordSuccess(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      // ignore
    }
    setTimeout(() => {
      setShowChangePasswordSheet(false);
      setPasswordSuccess(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 1200);
  };

  // فحص حالة التوثيق عند الضغط
  const handleVerificationPress = () => {
    if (user.verification_status === 'verified') {
      setShowVerifiedModal(true);
    } else if (user.verification_status === 'pending_review') {
      setShowPendingModal(true);
    } else {
      setShowVerificationModal(true);
    }
  };

  // حركة انكماش وصعود الأفاتار نحو النتش
  const avatarScale = scrollY.interpolate({
    inputRange: [-70, 0, 80],
    outputRange: [1.2, 1, 0.42],
    extrapolate: 'clamp',
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [-70, 0, 80],
    outputRange: [-12, 0, -32],
    extrapolate: 'clamp',
  });

  const avatarOpacity = scrollY.interpolate({
    inputRange: [0, 75, 105],
    outputRange: [1, 0.9, 0],
    extrapolate: 'clamp',
  });

  // تلاشي اسم المستخدم في جسم الصفحة أثناء الصعود
  const heroTextOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ظهور الهيدر فقط بعد أن يصعد الأفاتار ويمتصه النتش بالكامل - ويختفي تماماً عند النزول
  const headerOpacity = scrollY.interpolate({
    inputRange: [-300, 0, 85, 115],
    outputRange: [0, 0, 0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-300, 0, 85, 115],
    outputRange: [-120, -120, -120, 0],
    extrapolate: 'clamp',
  });

  /* ========================================================
     صفحة بلاغاتي المستقلة: صفحة مخصصة لمتابعة بلاغات المواطن
     ======================================================== */
  if (showMyReportsPage) {
    return (
      <View style={[styles.screenContainer, { paddingTop: topInset }]}>
        {/* هيدر صفحة بلاغاتي: شفاف بالكامل بدون باجراوند والعنوان في أقصى اليمين */}
        <View style={styles.cleanHeaderTransparent}>
          <View style={styles.cleanHeaderRow}>
            <Pressable
              style={styles.cleanBackArrowBtn}
              onPress={() => setShowMyReportsPage(false)}
              hitSlop={14}>
              <Ionicons name="arrow-forward" size={26} color="#0F172A" />
            </Pressable>

            <View style={styles.cleanTitlesCol}>
              <View style={styles.titleWithCountRow}>
                <Text style={styles.cleanMainHeading}>بلاغاتي</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{myReports.length}</Text>
                </View>
              </View>
              <Text style={styles.cleanSubHeading}>متابعة مراحل وحالة البلاغات المسجلة</Text>
            </View>
          </View>
        </View>

        {/* قائمة البلاغات داخل الصفحة */}
        <ScrollView
          style={styles.myReportsPageScroll}
          contentContainerStyle={[
            styles.myReportsPageContent,
            { paddingBottom: bottomTabPadding + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          canCancelContentTouches={true}
          directionalLockEnabled={false}
          overScrollMode="always">
          {myReports.length === 0 ? (
            <View style={styles.emptyReportsBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>لا توجد بلاغات مسجلة حالياً</Text>
              <Text style={styles.emptySub}>
                عند تقديم أي بلاغ من صفحة البلاغات، ستتمكن من متابعة خطوات تنفيذه خطوة بخطوة من هنا.
              </Text>
            </View>
          ) : (
            <View style={styles.myReportsList}>
              {myReports.map((report) => (
                <Pressable
                  key={report.id}
                  style={({ pressed }) => [
                    styles.myReportCard,
                    pressed && styles.myReportCardPressed,
                  ]}
                  onPress={() => setSelectedReportForTracking(report)}>
                  {/* السطر العلوي: تصنيف البلاغ ورقمه + حالة البلاغ */}
                  <View style={styles.reportCardTopRow}>
                    <View style={styles.reportCategoryBadgeRow}>
                      <View style={styles.reportCategoryPill}>
                        <Text style={styles.reportCategoryText}>{report.typeAr}</Text>
                      </View>
                      <Text style={styles.reportNumberText}>#{report.reportNumber}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadgePill,
                        report.status === 'resolved'
                          ? styles.statusResolved
                          : report.status === 'in_progress'
                          ? styles.statusInProgress
                          : styles.statusPending,
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          report.status === 'resolved'
                            ? styles.statusResolvedText
                            : report.status === 'in_progress'
                            ? styles.statusInProgressText
                            : styles.statusPendingText,
                        ]}>
                        {report.statusAr}
                      </Text>
                    </View>
                  </View>

                  {/* عنوان المشكلة */}
                  <Text style={styles.reportCardTitle} numberOfLines={2}>
                    {report.title}
                  </Text>

                  {/* المكان بالتفصيل */}
                  <View style={styles.reportAddressRow}>
                    <Ionicons name="location-sharp" size={14} color="#973c00" />
                    <Text style={styles.reportAddressText} numberOfLines={1}>
                      {report.address}
                    </Text>
                  </View>

                  {/* السطر السفلي: التاريخ + زر متابعة الخطوات */}
                  <View style={styles.reportCardFooterRow}>
                    <View style={styles.reportDateWrap}>
                      <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                      <Text style={styles.reportDateText}>{report.createdAtAr}</Text>
                    </View>
                    <View style={styles.trackStepsRow}>
                      <Text style={styles.trackStepsPrompt}>متابعة المراحل</Text>
                      <Ionicons name="chevron-back" size={14} color="#973c00" />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* موديولا متابعة مراحل البلاغ */}
        <ReportTrackingModal
          visible={!!selectedReportForTracking}
          report={
            selectedReportForTracking
              ? {
                  id: selectedReportForTracking.id,
                  reportNumber: selectedReportForTracking.reportNumber,
                  typeAr: selectedReportForTracking.typeAr,
                  title: selectedReportForTracking.title,
                  address: selectedReportForTracking.address,
                  status: selectedReportForTracking.status,
                  statusAr: selectedReportForTracking.statusAr,
                  createdAtAr: selectedReportForTracking.createdAtAr,
                  resolutionSummary: selectedReportForTracking.resolutionSummary,
                  steps: selectedReportForTracking.steps,
                }
              : null
          }
          onClose={() => setSelectedReportForTracking(null)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* هيدر علوي يظهر فقط بعد امتصاص النتش للأفاتار - والاسم على اليمين بدون كلمة متصل ويختفي تماماً عند النزول */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.topStickyHeader,
          {
            paddingTop: topInset,
            height: topInset + 48,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}>
        <View style={styles.headerRightCol}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {user.full_name}
          </Text>
        </View>
        <View style={styles.headerBorderLine} />
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabPadding },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        canCancelContentTouches={true}
        directionalLockEnabled={false}
        overScrollMode="always"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}>
        {/* قسم الهيرو: صورة الحساب المركزية وحركة الامتصاص نحو النتش */}
        <View style={styles.heroSection}>
          <Animated.View
            style={[
              styles.avatarWrap,
              {
                transform: [
                  { scale: avatarScale },
                  { translateY: avatarTranslateY },
                ],
                opacity: avatarOpacity,
              },
            ]}>
            {/* عند الضغط على الصورة: عرض الصورة كاملة بشاشة كاملة دون تغييرها */}
            <Pressable
              onPress={() => setShowFullImageModal(true)}
              style={styles.avatarCircle}>
              {getDirectImageUrl(user.avatar_url) ? (
                <Image source={{ uri: getDirectImageUrl(user.avatar_url) }} style={styles.avatarImg} />
              ) : (
                <View style={styles.initialsBox}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* الاسم فقط بدون كلمة متصل */}
          <Animated.View style={{ opacity: heroTextOpacity, alignItems: 'center' }}>
            <Text style={styles.heroName}>{user.full_name}</Text>
          </Animated.View>
        </View>

        {/* أزرار الإجراءات السريعة الثلاثة بنمط تيليجرام (Quick Actions) */}
        <View style={styles.quickActionsRow}>
          {/* زر تغيير الصورة: يفتح موديول خيارات من الأسفل */}
          <Pressable
            style={styles.actionCard}
            onPress={() => setShowChangePhotoSheet(true)}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="camera-outline" size={20} color="#973c00" />
            </View>
            <Text style={styles.actionCardLabel}>تغيير الصورة</Text>
          </Pressable>

          {/* زر تعديل البيانات: يفتح موديول تعديل من الأسفل */}
          <Pressable
            style={styles.actionCard}
            onPress={() => {
              setEditName(user.full_name);
              setEditArea(user.area);
              setShowEditModal(true);
            }}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="create-outline" size={20} color="#0284C7" />
            </View>
            <Text style={styles.actionCardLabel}>تعديل البيانات</Text>
          </Pressable>

          {/* زر توثيق الهوية: يفحص الحالة أولاً ويعرض الموديول المناسب */}
          <Pressable
            style={styles.actionCard}
            onPress={handleVerificationPress}>
            <View style={styles.actionIconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={
                  user.verification_status === 'verified'
                    ? '#16A34A'
                    : '#D97706'
                }
              />
            </View>
            <Text style={styles.actionCardLabel}>توثيق الهوية</Text>
          </Pressable>
        </View>

        {/* كرت البيانات الشخصية (الهاتف والعنوان) بنمط تيليجرام */}
        <View style={styles.infoCard}>
          {/* رقم الهاتف */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={19} color="#973c00" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoFieldLabel}>رقم الهاتف</Text>
              <Text style={styles.infoMainValue}>{user.phone}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* العنوان */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="location-outline" size={19} color="#973c00" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoFieldLabel}>العنوان</Text>
              <Text style={styles.infoMainValue}>{user.area || 'المنشية'}</Text>
            </View>
          </View>
        </View>

        {/* زر بلاغاتي فوق البصمة مباشرة */}
        <Pressable
          style={({ pressed }) => [
            styles.myReportsCardBtn,
            pressed && styles.myReportsCardBtnPressed,
          ]}
          onPress={() => setShowMyReportsPage(true)}>
          <View style={styles.myReportsBtnRightCol}>
            <View style={styles.myReportsIconSquare}>
              <Ionicons name="document-text" size={20} color="#973c00" />
            </View>
            <View style={styles.myReportsBtnTextCol}>
              <Text style={styles.myReportsBtnTitle}>بلاغاتي</Text>
              <Text style={styles.myReportsBtnSub}>
                متابعة البلاغات التي قمت بتقديمها ({myReports.length})
              </Text>
            </View>
          </View>
          <View style={styles.myReportsBtnLeftCol}>
            {myReports.length > 0 ? (
              <View style={styles.myReportsBadge}>
                <Text style={styles.myReportsBadgeText}>{myReports.length}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-back" size={19} color="#94A3B8" />
          </View>
        </Pressable>

        {/* زر تغيير كلمة السر بتصميم كرت تيليجرام أنيق */}
        <Pressable
          style={({ pressed }) => [
            styles.changePasswordCardBtn,
            pressed && styles.changePasswordCardBtnPressed,
          ]}
          onPress={() => {
            setPasswordError(null);
            setPasswordSuccess(false);
            setNewPassword('');
            setConfirmPassword('');
            setShowChangePasswordSheet(true);
          }}>
          <View style={styles.changePasswordBtnRightCol}>
            <View style={styles.changePasswordIconSquare}>
              <Ionicons name="key" size={20} color="#973c00" />
            </View>
            <View style={styles.changePasswordBtnTextCol}>
              <Text style={styles.changePasswordBtnTitle}>تغيير كلمة السر</Text>
              <Text style={styles.changePasswordBtnSub}>
                تحديث كلمة مرور الحساب وتأمين الهاتف
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-back" size={19} color="#94A3B8" />
        </Pressable>

        {/* كرت البصمة بتصميم تيليجرام نظيف مع التحقق بالبصمة قبل التبديل */}
        <View style={styles.bioCardStandalone}>
          <View style={styles.bioRightCol}>
            <Ionicons name="finger-print-outline" size={22} color="#64748B" />
            <Text style={styles.bioTitle}>الدخول بالبصمة</Text>
          </View>
          <Switch
            value={user.biometric_enabled}
            onValueChange={handleToggleBiometric}
            trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
            thumbColor={user.biometric_enabled ? '#973c00' : '#FFFFFF'}
          />
        </View>

        {/* إعداد تشغيل الفيديو التلقائي على شبكات Wi-Fi فقط */}
        <View style={styles.bioCardStandalone}>
          <View style={styles.bioRightCol}>
            <Ionicons name="wifi-outline" size={22} color="#64748B" />
            <View style={styles.settingTextCol}>
              <Text style={styles.bioTitle}>تشغيل الفيديو تلقائياً</Text>
              <Text style={styles.settingSubTitle}>
                على شبكات Wi-Fi فقط لتوفير باقة بيانات الهاتف
              </Text>
            </View>
          </View>
          <Switch
            value={autoPlayOnWifi}
            onValueChange={handleToggleAutoPlayOnWifi}
            trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
            thumbColor={autoPlayOnWifi ? '#973c00' : '#FFFFFF'}
          />
        </View>

        {/* زر تسجيل الخروج بتصميم تيليجرام نظيف تحت البصمة */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutCardBtn,
            pressed && styles.logoutCardBtnPressed,
          ]}
          onPress={logout}>
          <View style={styles.logoutRightCol}>
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text style={styles.logoutCardTitle}>تسجيل الخروج</Text>
          </View>
        </Pressable>
      </Animated.ScrollView>

      {/* ١. عرض الصورة الشخصية بشاشة كاملة (Fullscreen Image Viewer) وليس في موديول */}
      <Modal
        visible={showFullImageModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowFullImageModal(false)}>
        <View style={styles.fullScreenViewerContainer}>
          {/* شريط علوي للهيدر */}
          <View style={[styles.fullScreenViewerHeader, { paddingTop: topInset + 10 }]}>
            <View style={styles.fullScreenViewerUserCol}>
              <Text style={styles.fullScreenViewerName} numberOfLines={1}>
                {user.full_name}
              </Text>
              <Text style={styles.fullScreenViewerSub}>الصورة الشخصية</Text>
            </View>
            <Pressable
              onPress={() => setShowFullImageModal(false)}
              style={styles.fullScreenCloseBtn}
              hitSlop={12}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* محتوى الصورة بالكامل بوسط الشاشة */}
          <Pressable
            style={styles.fullScreenImageBody}
            onPress={() => setShowFullImageModal(false)}>
            {getDirectImageUrl(user.avatar_url) ? (
              <Image
                source={{ uri: getDirectImageUrl(user.avatar_url) }}
                style={styles.fullScreenAvatarImg}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.fullScreenInitialsCircle}>
                <Text style={styles.fullScreenInitialsText}>{initials}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* ٢. موديول اختيار/تغيير الصورة من الأسفل */}
      <Modal
        visible={showChangePhotoSheet}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowChangePhotoSheet(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowChangePhotoSheet(false)}>
          <Pressable
            style={styles.bottomSheetBox}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />

            <Pressable style={styles.sheetOptionRow} onPress={handleTakePhoto}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="camera" size={20} color="#973c00" />
              </View>
              <Text style={styles.sheetOptionText}>التقاط صورة بالكاميرا</Text>
            </Pressable>

            <Pressable style={styles.sheetOptionRow} onPress={handlePickFromGallery}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="image" size={20} color="#0284C7" />
              </View>
              <Text style={styles.sheetOptionText}>اختيار صورة من المعرض</Text>
            </Pressable>

            {user.avatar_url ? (
              <Pressable
                style={[styles.sheetOptionRow, { borderBottomWidth: 0 }]}
                onPress={handleRemovePhoto}>
                <View style={[styles.sheetIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </View>
                <Text style={[styles.sheetOptionText, { color: '#DC2626' }]}>
                  حذف الصورة الحالية
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ٣. موديول تعديل البيانات الشخصية من الأسفل */}
      <Modal
        visible={showEditModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowEditModal(false);
        }}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowEditModal(false);
          }}>
          <Animated.View
            style={[
              styles.bottomSheetBox,
              { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 24 : 36) },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetDragBar} />

              <Text style={styles.sheetInputLabel}>الاسم الكامل</Text>
              <TextInput
                style={styles.sheetInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="اكتب اسمك الثلاثي أو الرباعي"
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />

              <Text style={styles.sheetInputLabel}>المنطقة / الحي داخل القرية</Text>
              <TextInput
                style={styles.sheetInput}
                value={editArea}
                onChangeText={setEditArea}
                placeholder="اسم الحي أو المنطقة بالقرية"
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />

              <Pressable style={styles.sheetSaveBtnSingle} onPress={handleSaveProfile}>
                <Text style={styles.sheetSaveBtnText}>حفظ البيانات</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ٤. موديول للمستخدم الموثق رسمياً من الأسفل */}
      <Modal
        visible={showVerifiedModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowVerifiedModal(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowVerifiedModal(false)}>
          <Pressable
            style={styles.bottomSheetBox}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />
            <View style={styles.verifiedHeaderIcon}>
              <Ionicons name="shield-checkmark" size={44} color="#15803D" />
            </View>
            <Text style={styles.verifiedModalDesc}>
              تمت مراجعة بطاقة الرقم القومي الخاصة بك واعتماد حسابك رسمياً كمواطن موثق في قرية المنشية.
            </Text>
            <View style={styles.verifiedDetailRow}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.verifiedDetailText}>
                الاسم المعتمد: {user.full_name}
              </Text>
            </View>
            <View style={styles.verifiedDetailRow}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.verifiedDetailText}>
                الهاتف المسجل: {user.phone}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ٥. موديول قيد المراجعة من الأسفل */}
      <Modal
        visible={showPendingModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowPendingModal(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowPendingModal(false)}>
          <Pressable
            style={styles.bottomSheetBox}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />
            <View style={styles.pendingHeaderIcon}>
              <Ionicons name="time" size={44} color="#0284C7" />
            </View>
            <Text style={styles.pendingModalDesc}>
              تم استلام صور البطاقة وتشفيرها بنجاح بخوارزمية AES-256. يقوم مشرفو القرية حالياً بمطابقة البيانات لتفعيل شارة التوثيق في أقرب وقت.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* موديول تغيير كلمة السر المنبثق من الأسفل */}
      <Modal
        visible={showChangePasswordSheet}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowChangePasswordSheet(false);
        }}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowChangePasswordSheet(false);
          }}>
          <Animated.View
            style={[
              styles.changePasswordSheetBox,
              { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 24 : 36) },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetDragBar} />

              <View style={styles.changePasswordSheetHeader}>
                <View style={styles.changePasswordSheetIconCircle}>
                  <Ionicons name="key" size={24} color="#973c00" />
                </View>
                <Text style={styles.changePasswordSheetTitle}>تغيير كلمة السر</Text>
                <Text style={styles.changePasswordSheetSub}>
                  أدخل كلمة السر الجديدة وأعد كتابتها لتأكيد الحفظ
                </Text>
              </View>

              {passwordError ? (
                <View style={styles.passwordErrorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.passwordErrorText}>{passwordError}</Text>
                </View>
              ) : null}

              {passwordSuccess ? (
                <View style={styles.passwordSuccessBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.passwordSuccessText}>
                    تم تغيير كلمة السر بنجاح!
                  </Text>
                </View>
              ) : null}

              {/* حقل كلمة السر الجديدة */}
              <View style={styles.passwordFieldGroup}>
                <Text style={styles.passwordFieldLabel}>كلمة السر الجديدة</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="أدخل كلمة سر جديدة (٦ خانات فأكثر)"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      setPasswordError(null);
                    }}
                    selectionColor="#973c00"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    style={styles.passwordEyeBtn}
                    hitSlop={12}>
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              {/* حقل إعادة كلمة السر */}
              <View style={styles.passwordFieldGroup}>
                <Text style={styles.passwordFieldLabel}>إعادة كلمة السر</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="أعد كتابة كلمة السر للتأكيد"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setPasswordError(null);
                    }}
                    selectionColor="#973c00"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={styles.passwordEyeBtn}
                    hitSlop={12}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              {/* زر حفظ كلمة السر */}
              <Pressable
                style={({ pressed }) => [
                  styles.savePasswordBtn,
                  pressed && styles.savePasswordBtnPressed,
                  passwordSubmitting && styles.savePasswordBtnDisabled,
                ]}
                onPress={handleSavePassword}
                disabled={passwordSubmitting}>
                {passwordSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.savePasswordBtnText}>حفظ كلمة السر الجديدة</Text>
                )}
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ٦. نافذة رفع صورة البطاقة المشفرة للتوثيق (وجه وظهر) */}
      <VerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {}}
      />

      {/* موديولا متابعة خطوات ومراحل البلاغ بارتفاع تفاعلي سلس (١/٤ إلى ٣/٤) وبدون زر إكس */}
      <ReportTrackingModal
        visible={!!selectedReportForTracking}
        report={selectedReportForTracking}
        onClose={() => setSelectedReportForTracking(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  topStickyHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  headerRightCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  headerBorderLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 5,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  initialsBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 6,
  },
  quickActionsRow: {
    flexDirection: rtlFlexDirection,
    gap: 10,
    marginTop: 18,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionCardLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  infoFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
    width: '100%',
  },
  infoMainValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  logoutMainValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  infoSubLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  // كرت البصمة بتصميم تيليجرام
  bioCardStandalone: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    marginBottom: 12,
  },
  bioRightCol: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTextCol: {
    flex: 1,
    gap: 2,
    alignItems: 'flex-start',
  },
  settingSubTitle: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: rtlTextAlign,
  },
  bioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  // زر تسجيل الخروج بتصميم تيليجرام وبارتفاع أكبر وواضح
  logoutCardBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 19,
    minHeight: 58,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    marginBottom: 0,
  },
  logoutCardBtnPressed: {
    backgroundColor: '#F8FAFC',
  },
  logoutRightCol: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logoutCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  // تصميم البوتوم شيت الموحد بدون تعتيم ولا عناوين ولا أزرار إغلاق
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
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  fullScreenViewerContainer: {
    flex: 1,
    backgroundColor: '#0B0F17',
    justifyContent: 'space-between',
  },
  fullScreenViewerHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fullScreenViewerUserCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fullScreenViewerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  fullScreenViewerSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
    width: '100%',
  },
  fullScreenCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImageBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullScreenAvatarImg: {
    width: '100%',
    height: '100%',
    maxHeight: 520,
  },
  fullScreenInitialsCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenInitialsText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetOptionRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sheetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  sheetInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginBottom: 6,
    marginTop: 8,
  },
  sheetInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  sheetSaveBtnSingle: {
    backgroundColor: '#973c00',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  sheetSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  verifiedHeaderIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifiedModalDesc: {
    fontSize: 13.5,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
    marginBottom: 14,
    fontWeight: '600',
  },
  verifiedDetailRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  verifiedDetailText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  pendingHeaderIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pendingModalDesc: {
    fontSize: 13.5,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontWeight: '600',
  },

  /* ========================================================
     زر بلاغاتي فوق البصمة + صفحة بلاغاتي المستقلة
     ======================================================== */
  myReportsCardBtn: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  myReportsCardBtnPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.995 }],
  },
  myReportsBtnRightCol: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  myReportsIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  myReportsBtnTextCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  myReportsBtnTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  myReportsBtnSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  myReportsBtnLeftCol: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  myReportsBadge: {
    backgroundColor: '#973c00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  myReportsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  changePasswordCardBtn: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  changePasswordCardBtnPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.995 }],
  },
  changePasswordBtnRightCol: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  changePasswordIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  changePasswordBtnTextCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  changePasswordBtnTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  changePasswordBtnSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  /* هيدر صفحة بلاغاتي الشفاف بالكامل بدون أي باجراوند وبمحاذاة يمنى صارمة */
  cleanHeaderTransparent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
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
  cleanTitlesCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleWithCountRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  cleanMainHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  countPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#973c00',
  },
  cleanSubHeading: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
    width: '100%',
  },
  myReportsPageScroll: {
    flex: 1,
  },
  myReportsPageContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  emptyReportsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  myReportsList: {
    gap: 12,
  },
  myReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  myReportCardPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.99 }],
  },
  reportCardTopRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportCategoryBadgeRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  reportNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  reportCategoryPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reportCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#973c00',
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusResolved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusResolvedText: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusInProgress: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  statusInProgressText: {
    color: '#0369A1',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPendingText: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  reportCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reportAddressRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  reportAddressText: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  reportCardFooterRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reportDateWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  reportDateText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  trackStepsRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  trackStepsPrompt: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#973c00',
  },

  /* موديول متابعة الخطوات */
  sheetBackdropPress: {
    flex: 1,
  },
  timelineSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  timelineSheetHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timelineSheetTitleCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  timelineSheetMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  timelineSheetSubTitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  timelineCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineScrollBody: {
    paddingHorizontal: 18,
  },
  timelineScrollContent: {
    paddingVertical: 14,
    gap: 14,
  },
  currentStageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentStageLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  currentStageBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  currentStageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepperContainer: {
    paddingVertical: 6,
  },
  stepperStepRow: {
    flexDirection: rtlFlexDirection,
    gap: 14,
  },
  stepperAxisCol: {
    alignItems: 'center',
    width: 28,
  },
  stepNodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#16A34A',
  },
  nodeCurrent: {
    backgroundColor: '#0284C7',
  },
  nodePending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  nodePendingNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  currentPulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stepConnectingLine: {
    width: 2,
    flex: 1,
    minHeight: 38,
    marginVertical: 2,
  },
  lineCompleted: {
    backgroundColor: '#16A34A',
  },
  linePending: {
    backgroundColor: '#E2E8F0',
  },
  stepInfoBlock: {
    flex: 1,
    paddingBottom: 20,
    alignItems: 'stretch',
  },
  stepHeaderLine: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  stepTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  stepTitleCompleted: {
    color: '#0F172A',
  },
  stepTitleCurrent: {
    color: '#0284C7',
    fontWeight: '800',
  },
  stepTimeBadge: {
    fontSize: 11,
    color: '#94A3B8',
  },
  stepDescText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  resolutionReportCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    gap: 6,
  },
  resolutionReportHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  resolutionReportHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  resolutionReportBody: {
    fontSize: 12,
    color: '#166534',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  closeTimelineBtn: {
    backgroundColor: '#973c00',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeTimelineBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  changePasswordSheetBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  changePasswordSheetHeader: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
  },
  changePasswordSheetIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 6,
  },
  changePasswordSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  changePasswordSheetSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  passwordErrorBanner: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  passwordErrorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  passwordSuccessBanner: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  passwordSuccessText: {
    flex: 1,
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  passwordFieldGroup: {
    marginBottom: 14,
  },
  passwordFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 6,
  },
  passwordInputWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingVertical: 0,
  },
  passwordEyeBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePasswordBtn: {
    backgroundColor: '#973c00',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  savePasswordBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  savePasswordBtnDisabled: {
    opacity: 0.65,
  },
  savePasswordBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
});
