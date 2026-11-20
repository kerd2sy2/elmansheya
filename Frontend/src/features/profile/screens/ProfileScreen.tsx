import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Image,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { useAuth } from '@/features/auth/context/AuthContext';
import { uploadMediaToDrive } from '@/core/storage/driveUpload';
import { getDirectImageUrl } from '@/core/utils/googleDrive';
import {
  getMyReports,
  saveUserReports,
  MyReportItem,
  generateTimelineSteps,
} from '@/features/reports/storage/myReportsStorage';
import {
  getAutoPlayOnWifiSetting,
  setAutoPlayOnWifiSetting,
} from '@/core/storage/videoSettingsStorage';
import { API_BASE_URL } from '@/core/config/api.config';

import { styles } from '../styles/profile.styles';
import { FullScreenImageViewer } from '../components/FullScreenImageViewer';
import { AvatarActionSheet } from '../components/AvatarActionSheet';
import { EditProfileModal } from '../components/EditProfileModal';
import {
  VerifiedUserModal,
  PendingUserModal,
} from '../components/VerificationStatusModals';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { MyReportsView } from '../components/MyReportsView';
import { VerificationModal } from '../components/VerificationModal';
import { UpdatesModal } from '../components/UpdatesModal';

export function ProfileScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const {
    user,
    logout,
    updateProfile,
    toggleBiometric,
  } = useAuth();

  const scrollY = useRef(new Animated.Value(0)).current;

  // إعداد تشغيل الفيديو التلقائي على شبكات Wi-Fi فقط
  const [autoPlayOnWifi, setAutoPlayOnWifi] = useState<boolean>(true);

  useEffect(() => {
    getAutoPlayOnWifiSetting().then(setAutoPlayOnWifi);
  }, []);

  const handleToggleAutoPlayOnWifi = async (nextValue: boolean) => {
    setAutoPlayOnWifi(nextValue);
    await setAutoPlayOnWifiSetting(nextValue);
  };

  // الموديولات المنبثقة والشاشات الفرعية
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
  const [showChangePhotoSheet, setShowChangePhotoSheet] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState<boolean>(false);
  const [showPendingModal, setShowPendingModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showChangePasswordSheet, setShowChangePasswordSheet] = useState<boolean>(false);
  const [showMyReportsPage, setShowMyReportsPage] = useState<boolean>(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState<boolean>(false);

  // بلاغات المستخدم
  const [myReports, setMyReports] = useState<MyReportItem[]>([]);

  // التعامل مع زر الرجوع في أندرويد
  useEffect(() => {
    const onBackPress = () => {
      if (showUpdatesModal) {
        setShowUpdatesModal(false);
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
    showChangePasswordSheet,
    showUpdatesModal,
    showFullImageModal,
    showChangePhotoSheet,
    showEditModal,
    showVerificationModal,
    showVerifiedModal,
    showPendingModal,
  ]);

  // جلب بلاغات المستخدم
  const loadUserReports = useCallback(async () => {
    if (!user?.phone) {
      setMyReports([]);
      return;
    }
    const userKey = user.phone;
    try {
      const local = await getMyReports(userKey);
      setMyReports(local);
    } catch {
      // ignore
    }

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reports/my-reports?phone=${encodeURIComponent(userKey)}`
      );
      if (!resp.ok) return;
      const json = await resp.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped: MyReportItem[] = json.data.map((r: any) => ({
          id: String(r.id),
          reportNumber: Number(r.id),
          typeAr: r.report_type_ar || 'بلاغ',
          title: r.title,
          address: r.manual_address || 'قرية المنشية',
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
      // وضع الأوفلاين
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUserReports();
    }, [loadUserReports])
  );

  if (!user) {
    return null;
  }

  // الحروف الأولى للاسم
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

  const handleRemovePhoto = () => {
    setShowChangePhotoSheet(false);
    updateProfile({ avatar_url: '' });
  };

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

  const handleVerificationPress = () => {
    if (user.verification_status === 'verified') {
      setShowVerifiedModal(true);
    } else if (user.verification_status === 'pending_review') {
      setShowPendingModal(true);
    } else {
      setShowVerificationModal(true);
    }
  };

  // حركة انكماش وصعود الأفاتار
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

  const heroTextOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 115],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-300, 0, 85, 115],
    outputRange: [-120, -120, -120, 0],
    extrapolate: 'clamp',
  });

  // إذا تم فتح صفحة بلاغاتي
  if (showMyReportsPage) {
    return (
      <MyReportsView
        reports={myReports}
        onBack={() => setShowMyReportsPage(false)}
        topInset={topInset}
        bottomTabPadding={bottomTabPadding}
      />
    );
  }

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* هيدر علوي يظهر فقط بعد امتصاص النتش للأفاتار */}
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
            <Pressable
              onPress={() => setShowFullImageModal(true)}
              style={styles.avatarCircle}>
              {getDirectImageUrl(user.avatar_url) ? (
                <Image source={{ uri: getDirectImageUrl(user.avatar_url)! }} style={styles.avatarImg} />
              ) : (
                <View style={styles.initialsBox}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View style={{ opacity: heroTextOpacity, alignItems: 'center' }}>
            <Text style={styles.heroName}>{user.full_name}</Text>
          </Animated.View>
        </View>

        {/* أزرار الإجراءات السريعة الثلاثة بنمط تيليجرام */}
        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => setShowChangePhotoSheet(true)}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="camera-outline" size={20} color="#973c00" />
            </View>
            <Text style={styles.actionCardLabel}>تغيير الصورة</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => setShowEditModal(true)}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="create-outline" size={20} color="#0284C7" />
            </View>
            <Text style={styles.actionCardLabel}>تعديل البيانات</Text>
          </Pressable>

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

        {/* كرت البيانات الشخصية */}
        <View style={styles.infoCard}>
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

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar-outline" size={19} color="#973c00" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoFieldLabel}>تاريخ الميلاد</Text>
              <Text style={styles.infoMainValue}>{user.birth_date || 'غير مسجل'}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

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

        {/* زر بلاغاتي */}
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

        {/* زر تغيير كلمة السر */}
        <Pressable
          style={({ pressed }) => [
            styles.changePasswordCardBtn,
            pressed && styles.changePasswordCardBtnPressed,
          ]}
          onPress={() => setShowChangePasswordSheet(true)}>
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

        {/* كرت البصمة */}
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

        {/* إعداد تشغيل الفيديو التلقائي */}
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

        {/* زر تحديثات التطبيق */}
        <Pressable
          style={({ pressed }) => [
            styles.changePasswordCardBtn,
            pressed && styles.changePasswordCardBtnPressed,
          ]}
          onPress={() => setShowUpdatesModal(true)}>
          <View style={styles.changePasswordBtnRightCol}>
            <View style={[styles.changePasswordIconSquare, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="cloud-download-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.changePasswordBtnTextCol}>
              <Text style={styles.changePasswordBtnTitle}>تحديثات التطبيق</Text>
              <Text style={styles.changePasswordBtnSub}>
                فحص وتنزيل أحدث إصدار متوفر فورياً
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-back" size={19} color="#94A3B8" />
        </Pressable>

        {/* زر تسجيل الخروج */}
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

      {/* الموديولات المنفصلة */}
      <FullScreenImageViewer
        visible={showFullImageModal}
        onClose={() => setShowFullImageModal(false)}
        fullName={user.full_name}
        avatarUrl={user.avatar_url}
        initials={initials}
        topInset={topInset}
      />

      <AvatarActionSheet
        visible={showChangePhotoSheet}
        onClose={() => setShowChangePhotoSheet(false)}
        onTakePhoto={handleTakePhoto}
        onPickFromGallery={handlePickFromGallery}
        onRemovePhoto={handleRemovePhoto}
        hasAvatar={Boolean(user.avatar_url)}
      />

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialName={user.full_name}
        initialBirthDate={user.birth_date ?? ''}
        initialArea={user.area}
        onSave={(data) => updateProfile(data)}
      />

      <VerifiedUserModal
        visible={showVerifiedModal}
        onClose={() => setShowVerifiedModal(false)}
        fullName={user.full_name}
        phone={user.phone}
      />

      <PendingUserModal
        visible={showPendingModal}
        onClose={() => setShowPendingModal(false)}
      />

      <ChangePasswordModal
        visible={showChangePasswordSheet}
        onClose={() => setShowChangePasswordSheet(false)}
        phone={user.phone}
      />

      <VerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {}}
      />

      <UpdatesModal
        visible={showUpdatesModal}
        onClose={() => setShowUpdatesModal(false)}
      />
    </View>
  );
}
