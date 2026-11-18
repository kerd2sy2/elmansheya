import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  I18nManager,
  Image,
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
import { rtlFlexDirection } from '@/core/theme/rtl';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { useAuth } from '@/features/auth/context/AuthContext';
import { canAccessSection, ADMIN_ROLES_CONFIG, AdminRole } from '@/core/permissions/adminRoles';
import { SuperAdminDashboardScreen } from '@/features/admin/screens/SuperAdminDashboardScreen';
import { NewsManagementScreen } from '@/features/admin/screens/NewsManagementScreen';
import { ServicesManagementScreen } from '@/features/admin/screens/ServicesManagementScreen';
import { CraftsmenManagementScreen } from '@/features/admin/screens/CraftsmenManagementScreen';
import { VerificationModal } from '../components/VerificationModal';

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
  const [activeAdminModal, setActiveAdminModal] = useState<'none' | 'staff' | 'news' | 'services' | 'craftsmen'>('none');

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

  // التقاط صورة بالكاميرا
  const handleTakePhoto = async () => {
    setShowChangePhotoSheet(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'برجاء منح الإذن للوصول إلى الكاميرا لالتقاط الصورة');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        updateProfile({ avatar_url: res.assets[0].uri });
      }
    } catch {
      Alert.alert('خطأ', 'تعذر التقاط الصورة عبر الكاميرا');
    }
  };

  // اختيار صورة من المعرض
  const handlePickFromGallery = async () => {
    setShowChangePhotoSheet(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        updateProfile({ avatar_url: res.assets[0].uri });
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

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('تنبيه', 'برجاء كتابة الاسم الكامل');
      return;
    }
    updateProfile({ full_name: editName, area: editArea });
    setShowEditModal(false);
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
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.initialsBox}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* الاسم ورتبة الإدارة */}
          <Animated.View style={{ opacity: heroTextOpacity, alignItems: 'center' }}>
            <Text style={styles.heroName}>{user.full_name}</Text>
            <View style={styles.roleBadgeHero}>
              <Ionicons name="shield-checkmark" size={14} color="#973c00" />
              <Text style={styles.roleBadgeHeroText}>
                {ADMIN_ROLES_CONFIG[user.role as AdminRole]?.titleAr || user.role_name_ar || 'إدارة التطبيق'}
              </Text>
            </View>
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

        {/* كرت البيانات الشخصية (الهاتف والمنطقة) بنمط تيليجرام */}
        <View style={styles.infoCard}>
          {/* رقم الهاتف */}
          <View style={styles.infoRow}>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoMainValue}>{user.phone}</Text>
              <Text style={styles.infoSubLabel}>رقم الهاتف المحمول (مسجل في القرية)</Text>
            </View>
            <Ionicons name="call-outline" size={18} color="#94A3B8" />
          </View>

          <View style={styles.cardDivider} />

          {/* المنطقة والعنوان */}
          <View style={styles.infoRow}>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoMainValue}>{user.area || 'المنشية'}</Text>
              <Text style={styles.infoSubLabel}>الحي / المنطقة داخل القرية</Text>
            </View>
            <Ionicons name="location-outline" size={18} color="#94A3B8" />
          </View>
        </View>

        {/* كرت لوحة التحكم والإدارة المتقدمة حسب الصلاحيات */}
        <View style={styles.adminCard}>
          <View style={styles.adminHeaderRow}>
            <View style={styles.adminTitleRow}>
              <View style={styles.adminBadgeIcon}>
                <Ionicons name="shield-checkmark" size={18} color="#973c00" />
              </View>
              <Text style={styles.adminCardTitle}>لوحة التحكم والصلاحيات</Text>
            </View>
            <View style={styles.adminRoleTag}>
              <Text style={styles.adminRoleTagText}>
                {ADMIN_ROLES_CONFIG[user.role as AdminRole]?.titleAr || user.role_name_ar || 'مسؤول'}
              </Text>
            </View>
          </View>

          <Text style={styles.adminCardDesc}>
            {ADMIN_ROLES_CONFIG[user.role as AdminRole]?.descriptionAr || 'إدارة خدمات ومحتوى قرية المنشية.'}
          </Text>

          <View style={styles.adminDivider} />

          <View style={styles.adminSectionsList}>
            {canAccessSection(user.role, 'staff_management') && (
              <Pressable
                style={styles.adminSectionItem}
                onPress={() => setActiveAdminModal('staff')}>
                <View style={[styles.adminSectionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="people" size={22} color="#D97706" />
                </View>
                <View style={styles.adminSectionTexts}>
                  <Text style={styles.adminSectionTitle}>إدارة الكوادر والمشرفين</Text>
                  <Text style={styles.adminSectionSub}>التحكم في المساعدين الـ ٤ وتوثيق الحسابات</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
              </Pressable>
            )}

            {canAccessSection(user.role, 'news') && (
              <Pressable
                style={styles.adminSectionItem}
                onPress={() => setActiveAdminModal('news')}>
                <View style={[styles.adminSectionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="newspaper" size={22} color="#2563EB" />
                </View>
                <View style={styles.adminSectionTexts}>
                  <Text style={styles.adminSectionTitle}>إدارة ونشر الأخبار والتغطيات</Text>
                  <Text style={styles.adminSectionSub}>روابط Google Drive وتغطيات الفيديو والصور</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
              </Pressable>
            )}

            {canAccessSection(user.role, 'services') && (
              <Pressable
                style={styles.adminSectionItem}
                onPress={() => setActiveAdminModal('services')}>
                <View style={[styles.adminSectionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="grid" size={22} color="#16A34A" />
                </View>
                <View style={styles.adminSectionTexts}>
                  <Text style={styles.adminSectionTitle}>إدارة الفروع الخدمية التسعة</Text>
                  <Text style={styles.adminSectionSub}>الصحة، المناسبات، المواصلات، المساجد، المحلات...</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
              </Pressable>
            )}

            {canAccessSection(user.role, 'craftsmen') && (
              <Pressable
                style={[styles.adminSectionItem, { borderBottomWidth: 0 }]}
                onPress={() => setActiveAdminModal('craftsmen')}>
                <View style={[styles.adminSectionIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="construct" size={22} color="#973c00" />
                </View>
                <View style={styles.adminSectionTexts}>
                  <Text style={styles.adminSectionTitle}>إدارة واعتماد الصنايعية</Text>
                  <Text style={styles.adminSectionSub}>مراجعة طلبات مهنيي وحرفيي القرية وتوثيقهم</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
              </Pressable>
            )}
          </View>
        </View>

        {/* كرت البصمة بتصميم تيليجرام نظيف */}
        <View style={styles.bioCardStandalone}>
          <View style={styles.bioRightCol}>
            <Ionicons name="finger-print-outline" size={22} color="#64748B" />
            <Text style={styles.bioTitle}>الدخول بالبصمة</Text>
          </View>
          <Switch
            value={user.biometric_enabled}
            onValueChange={toggleBiometric}
            trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
            thumbColor={user.biometric_enabled ? '#973c00' : '#FFFFFF'}
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

      {/* ١. موديول عرض الصورة الشخصية كاملة من الأسفل بدون تعتيم وبدون عناوين أو أزرار إغلاق */}
      <Modal
        visible={showFullImageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFullImageModal(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowFullImageModal(false)}>
          <Pressable
            style={styles.bottomSheetBox}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />
            <View style={styles.fullImageSheetWrap}>
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.fullSheetAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.fullInitialsCircle}>
                  <Text style={styles.fullInitialsText}>{initials}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ٢. موديول اختيار/تغيير الصورة من الأسفل بدون عنوان ولا زر إغلاق ولا تعتيم */}
      <Modal
        visible={showChangePhotoSheet}
        transparent
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

      {/* ٣. موديول تعديل البيانات الشخصية من الأسفل بدون عنوان ولا زر إلغاء ولا تعتيم */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}>
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowEditModal(false)}>
          <Pressable
            style={styles.bottomSheetBox}
            onPress={(e) => e.stopPropagation()}>
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
        </Pressable>
      </Modal>

      {/* ٤. موديول للمستخدم الموثق رسمياً من الأسفل بدون عنوان ولا زر إغلاق ولا تعتيم */}
      <Modal
        visible={showVerifiedModal}
        transparent
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

      {/* ٥. موديول قيد المراجعة من الأسفل بدون عنوان ولا زر إغلاق ولا تعتيم */}
      <Modal
        visible={showPendingModal}
        transparent
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

      {/* ٦. نافذة رفع صورة البطاقة المشفرة للتوثيق (وجه وظهر) */}
      <VerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {}}
      />

      {/* ٧. نافذة شاشات الإدارة والتحكم للمشرفين والمساعدين */}
      <Modal
        visible={activeAdminModal !== 'none'}
        animationType="slide"
        onRequestClose={() => setActiveAdminModal('none')}>
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: topInset }}>
          <View style={styles.adminModalHeader}>
            <Pressable
              onPress={() => setActiveAdminModal('none')}
              style={styles.adminModalBackBtn}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </Pressable>
            <Text style={styles.adminModalHeaderTitle}>
              {activeAdminModal === 'staff' && 'إدارة الكوادر والمشرفين'}
              {activeAdminModal === 'news' && 'إدارة الأخبار والتغطيات (درايف)'}
              {activeAdminModal === 'services' && 'إدارة الفروع الخدمية التسعة'}
              {activeAdminModal === 'craftsmen' && 'إدارة واعتماد الصنايعية'}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={{ flex: 1 }}>
            {activeAdminModal === 'staff' && <SuperAdminDashboardScreen />}
            {activeAdminModal === 'news' && <NewsManagementScreen />}
            {activeAdminModal === 'services' && <ServicesManagementScreen />}
            {activeAdminModal === 'craftsmen' && <CraftsmenManagementScreen />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topStickyHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'flex-end',
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
    alignItems: 'flex-start',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  infoMainValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  logoutMainValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'right',
  },
  infoSubLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'right',
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
  bioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
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
    textAlign: 'right',
  },
  // تصميم البوتوم شيت الموحد بدون تعتيم ولا عناوين ولا أزرار إغلاق
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
  fullImageSheetWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  fullSheetAvatar: {
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  fullInitialsCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullInitialsText: {
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
    textAlign: 'right',
  },
  sheetInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
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
  roleBadgeHero: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 6,
  },
  roleBadgeHeroText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  adminHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminTitleRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  adminBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminRoleTag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  adminRoleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#973c00',
  },
  adminCardDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    lineHeight: 18,
    marginTop: 2,
  },
  adminDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  adminSectionsList: {
    gap: 8,
  },
  adminSectionItem: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  adminSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  adminSectionTexts: {
    flex: 1,
    alignItems: 'flex-start',
  },
  adminSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  adminSectionSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  adminModalHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  adminModalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
});
