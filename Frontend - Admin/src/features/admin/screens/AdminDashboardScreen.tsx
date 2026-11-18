import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeBottomTabPadding, useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ADMIN_ROLES_CONFIG, AdminRole, canAccessSection } from '@/core/permissions/adminRoles';
import { useNewsFeed } from '@/features/news/hooks/useNewsFeed';
import { NewsCardItem } from '@/features/news/types/news.types';
import { NewsDetailScreen } from '@/features/news/screens/NewsDetailScreen';
import { API_BASE_URL } from '@/core/config/api.config';

export function AdminDashboardScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { feed, loading, refreshing, refresh } = useNewsFeed();

  const [selectedNews, setSelectedNews] = useState<NewsCardItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // حالة سحابة جوجل درايف 5 تيرا
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveClientEmail, setDriveClientEmail] = useState<string>('');
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [driveJsonInput, setDriveJsonInput] = useState<string>('');
  const [savingDrive, setSavingDrive] = useState<boolean>(false);

  const checkDriveStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/drive-status`);
      const json = await res.json();
      if (res.ok && json.success) {
        setDriveConnected(Boolean(json.data?.google_drive_connected));
        setDriveClientEmail(json.data?.client_email || '');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const handleRefresh = () => {
    refresh();
    checkDriveStatus();
  };

  const handleSaveDriveCredentials = async () => {
    if (!driveJsonInput.trim()) {
      Alert.alert('تنبيه', 'يرجى لصق محتوى ملف مفتاح Google Service Account بصيغة JSON.');
      return;
    }
    setSavingDrive(true);
    try {
      const res = await fetch(`${API_BASE_URL}/storage/drive-configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ credentials_json: driveJsonInput.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        Alert.alert(
          '🎉 تم ربط سحابة Google Drive بنجاح!',
          `تم تفعيل حساب الـ 5 تيرا للرفع المباشر.\n\nالمجلد: Elmansheya\nحساب الخدمة: ${json.data?.client_email || ''}\n\nالآن سيتم حفظ جميع الصور والفيديوهات مباشرة على جوجل درايف وستكون سرعة التحميل فائقة للمواطنين وبدون استهلاك أي مساحة أو ترافيك من السيرفر.`
        );
        setShowDriveModal(false);
        setDriveJsonInput('');
        checkDriveStatus();
      } else {
        Alert.alert('تعذر التفعيل', json?.error?.message || json?.data?.warning || 'يرجى التحقق من صحة ملف JSON.');
      }
    } catch (err: any) {
      Alert.alert('خطأ في الاتصال', `تعذر الاتصال بالسيرفر: ${err?.message || ''}`);
    } finally {
      setSavingDrive(false);
    }
  };

  const roleConfig = ADMIN_ROLES_CONFIG[user?.role as AdminRole];
  const roleTitle = roleConfig?.titleAr || user?.role_name_ar || 'مسؤول النظام';

  const totalNewsCount =
    (feed?.breaking_news?.length ?? 0) +
    (feed?.pinned_featured?.length ?? 0) +
    (feed?.small_news?.length ?? 0);

  // حذف خبر فوراً من تطبيق المواطن
  const handleDeleteNews = (id: string, title: string) => {
    Alert.alert(
      'تأكيد حذف الخبر',
      `هل أنت متأكد من حذف خبر: "${title}" نهائياً من تطبيق المواطنين؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف الآن',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              const res = await fetch(`${API_BASE_URL}/news/delete?id=${encodeURIComponent(id)}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const json = await res.json();
              if (res.ok && json.success) {
                Alert.alert('تم الحذف', 'تم إزالة الخبر فوراً من تطبيق المواطنين.');
                refresh();
              } else {
                Alert.alert('خطأ', json?.error?.message || 'تعذر حذف الخبر.');
              }
            } catch {
              Alert.alert('خطأ في الاتصال', 'تعذر الوصول إلى الخادم.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset + 12, paddingBottom: bottomTabPadding + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#973c00" />
        }>
        {/* الترويسة الرئيسية العليا: هوية المشرف العام والقرية */}
        <View style={styles.topHeaderCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerUserInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {user?.full_name?.slice(0, 2) || 'من'}
                </Text>
              </View>
              <View style={styles.userNameBlock}>
                <View style={styles.nameWithBadge}>
                  <Text style={styles.userFullName}>{user?.full_name || 'المشرف العام'}</Text>
                  {user?.verification_status === 'verified' && (
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  )}
                </View>
                <View style={styles.roleTag}>
                  <Ionicons name="shield-checkmark" size={13} color="#973c00" />
                  <Text style={styles.roleTagText}>{roleTitle}</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.refreshBtn}
              onPress={handleRefresh}
              accessibilityLabel="تحديث">
              <Ionicons name="refresh" size={20} color="#475569" />
            </Pressable>
          </View>

          {/* شريط مؤشرات النظام وسحابة Google Drive */}
          <View style={styles.systemStatusGrid}>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.statusPillText}>الخادم: متصل ومؤمن</Text>
            </View>
            <Pressable
              style={styles.statusPill}
              onPress={() => setShowDriveModal(true)}>
              <Ionicons
                name="logo-google"
                size={13}
                color={driveConnected ? '#16A34A' : '#D97706'}
              />
              <Text style={styles.statusPillText}>
                {driveConnected ? 'سحابة Drive: 5TB متصلة' : 'سحابة Drive: اضغط للربط'}
              </Text>
            </Pressable>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.statusPillText}>المواطنين: قراءة فقط</Text>
            </View>
          </View>
        </View>

        {/* كروت الإحصائيات الأربعة السريعة */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#973c00' }]}>
            <Ionicons name="newspaper" size={22} color="#973c00" />
            <Text style={styles.statNumber}>{totalNewsCount}</Text>
            <Text style={styles.statLabel}>أخبار منشورة</Text>
          </View>

          <View style={[styles.statCard, { borderTopColor: '#0284C7' }]}>
            <Ionicons name="grid" size={22} color="#0284C7" />
            <Text style={styles.statNumber}>٩</Text>
            <Text style={styles.statLabel}>فروع خدمات</Text>
          </View>

          <View style={[styles.statCard, { borderTopColor: '#16A34A' }]}>
            <Ionicons name="construct" size={22} color="#16A34A" />
            <Text style={styles.statNumber}>١٢+</Text>
            <Text style={styles.statLabel}>صنايعية معتمدين</Text>
          </View>

          <View style={[styles.statCard, { borderTopColor: '#D97706' }]}>
            <Ionicons name="people" size={22} color="#D97706" />
            <Text style={styles.statNumber}>٦</Text>
            <Text style={styles.statLabel}>طاقم الإدارة</Text>
          </View>
        </View>

        {/* بطاقة حالة التخزين السحابي Google Drive 5TB البارزة */}
        {driveConnected ? (
          <View style={styles.driveStatusCardSuccess}>
            <View style={styles.driveStatusIconBoxSuccess}>
              <Ionicons name="cloud-done" size={24} color="#16A34A" />
            </View>
            <View style={styles.driveStatusTextCol}>
              <View style={styles.driveStatusBadgeRow}>
                <Text style={styles.driveStatusTitleSuccess}>سحابة Google Drive (5 تيرا) نشطة</Text>
                <View style={styles.greenActiveDot} />
              </View>
              <Text style={styles.driveStatusSubSuccess}>
                الرفع مباشر على سحابتك في مجلد «Elmansheya» • استهلاك وضغط السيرفر 0%
              </Text>
              {driveClientEmail ? (
                <Text style={styles.driveEmailText} numberOfLines={1}>
                  {driveClientEmail}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.driveStatusCardWarning,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => setShowDriveModal(true)}>
            <View style={styles.driveStatusIconBoxWarning}>
              <Ionicons name="cloud-upload-outline" size={24} color="#D97706" />
            </View>
            <View style={styles.driveStatusTextCol}>
              <View style={styles.driveStatusBadgeRow}>
                <Text style={styles.driveStatusTitleWarning}>مساحة Google Drive (5 تيرا) غير مفعلة</Text>
                <View style={styles.yellowPendingDot} />
              </View>
              <Text style={styles.driveStatusSubWarning}>
                الصور تحفظ محلياً مؤقتاً. اضغط هنا لتفعيل الرفع المباشر على حسابك 5 تيرا لتوفير مساحة السيرفر وسرعة البث.
              </Text>
            </View>
            <View style={styles.connectDriveBtnPill}>
              <Text style={styles.connectDriveBtnText}>ربط 5TB</Text>
              <Ionicons name="chevron-back" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        )}

        {/* زر النشر الفوري الرئيسي البارز والمميز (Primary Action) */}
        <Pressable
          style={({ pressed }) => [styles.publishActionHero, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
          onPress={() => router.push('/publish' as any)}>
          <View style={styles.publishHeroInner}>
            <View style={styles.publishHeroIconBox}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.publishHeroTextCol}>
              <Text style={styles.publishHeroTitle}>نشر خبر أو عاجل جديد للقرية</Text>
              <Text style={styles.publishHeroSub}>
                دعم روابط فيديوهات وصور Google Drive المباشرة دون إجهاد السيرفر
              </Text>
            </View>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* شبكة الوصول السريع لأقسام التحكم */}
        <Text style={styles.sectionHeaderTitle}>أقسام التحكم والإدارة</Text>
        <View style={styles.modulesGrid}>
          {canAccessSection(user?.role, 'news') && (
            <Pressable
              style={styles.moduleItem}
              onPress={() => router.push('/publish' as any)}>
              <View style={[styles.moduleIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="newspaper-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.moduleItemTitle}>استوديو النشر</Text>
              <Text style={styles.moduleItemDesc}>نشر الأخبار، العواجل، وروابط درايف</Text>
            </Pressable>
          )}

          {canAccessSection(user?.role, 'services') && (
            <Pressable
              style={styles.moduleItem}
              onPress={() => router.push('/services' as any)}>
              <View style={[styles.moduleIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="grid-outline" size={24} color="#16A34A" />
              </View>
              <Text style={styles.moduleItemTitle}>الفروع والخدمات</Text>
              <Text style={styles.moduleItemDesc}>المناسبات، الحالات، الصحة، المواصلات...</Text>
            </Pressable>
          )}

          {canAccessSection(user?.role, 'craftsmen') && (
            <Pressable
              style={styles.moduleItem}
              onPress={() => router.push('/craftsmen' as any)}>
              <View style={[styles.moduleIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="construct-outline" size={24} color="#973c00" />
              </View>
              <Text style={styles.moduleItemTitle}>اعتماد الصنايعية</Text>
              <Text style={styles.moduleItemDesc}>توثيق مهنيي القرية وتعديل البيانات</Text>
            </Pressable>
          )}

          {canAccessSection(user?.role, 'staff_management') && (
            <Pressable
              style={styles.moduleItem}
              onPress={() => router.push('/profile' as any)}>
              <View style={[styles.moduleIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="people-circle-outline" size={24} color="#D97706" />
              </View>
              <Text style={styles.moduleItemTitle}>الكوادر والصلاحيات</Text>
              <Text style={styles.moduleItemDesc}>إدارة الـ ٤ مساعدين وتوثيق المشرفين</Text>
            </Pressable>
          )}
        </View>

        {/* المعروض حالياً في تطبيق المواطنين مع أزرار التحكم اللحظية */}
        <View style={styles.feedHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>المعروض حالياً في تطبيق المواطنين</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>بث مباشر</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#973c00" />
            <Text style={styles.loadingText}>جاري استرجاع منشورات القرية...</Text>
          </View>
        ) : totalNewsCount === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="newspaper-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>لا توجد منشورات حالياً في تطبيق القرية</Text>
            <Text style={styles.emptySub}>
              اضغط على زر النشر بالأعلى لكتابة ونشر أول خبر لأهالي المنشية.
            </Text>
          </View>
        ) : (
          <View style={styles.newsListWrap}>
            {/* الأخبار العاجلة */}
            {feed?.breaking_news?.map((item) => (
              <View key={`b-${item.id}`} style={styles.breakingItemCard}>
                <View style={styles.breakingBadge}>
                  <Text style={styles.breakingBadgeText}>عاجل</Text>
                </View>
                <Text style={styles.breakingText}>{item.title}</Text>
                <Pressable
                  style={styles.deleteMiniBtn}
                  disabled={deletingId === item.id}
                  onPress={() => handleDeleteNews(item.id, item.title)}>
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  )}
                </Pressable>
              </View>
            ))}

            {/* الخبر المميز المثبت */}
            {feed?.pinned_featured?.map((item) => (
              <View key={`f-${item.id}`} style={styles.adminNewsCard}>
                <View style={styles.adminNewsCardHeader}>
                  <View style={styles.cardBadgeRow}>
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={12} color="#973c00" />
                      <Text style={styles.pinnedBadgeText}>مثبت في القمة</Text>
                    </View>
                    {item.cover_image_url ? (
                      <View style={styles.mediaTypeBadge}>
                        <Ionicons name="image-outline" size={12} color="#0284C7" />
                        <Text style={styles.mediaTypeBadgeText}>صورة/درايف</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardTimeText}>اليوم</Text>
                </View>

                <Text style={styles.adminNewsTitle}>{item.title}</Text>
                <Text style={styles.adminNewsSummary} numberOfLines={2}>
                  {item.summary}
                </Text>

                <View style={styles.adminNewsFooter}>
                  <View style={styles.authorBadgeCol}>
                    <View style={styles.authorBadgeRow}>
                      <Text style={styles.authorNameText}>
                        الناشر: {item.author_display_name || 'الإدارة'}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    </View>
                    <View style={styles.roleMiniTag}>
                      <Ionicons name="shield-checkmark" size={10} color="#973c00" />
                      <Text style={styles.authorRoleSubText}>
                        {item.author_badge_label || (item.author_is_verified ? 'المشرف العام' : 'إدارة النشر')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionsBtnRow}>
                    <Pressable
                      style={styles.viewNewsBtn}
                      onPress={() => setSelectedNews(item)}>
                      <Ionicons name="eye-outline" size={16} color="#0284C7" />
                      <Text style={styles.viewNewsBtnText}>معاينة</Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteNewsBtn}
                      disabled={deletingId === item.id}
                      onPress={() => handleDeleteNews(item.id, item.title)}>
                      {deletingId === item.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          <Text style={styles.deleteNewsBtnText}>حذف</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {/* قائمة الأخبار المعتادة */}
            {feed?.small_news?.map((item) => (
              <View key={`s-${item.id}`} style={styles.adminNewsCard}>
                <View style={styles.adminNewsCardHeader}>
                  <View style={styles.cardBadgeRow}>
                    <View style={styles.regularBadge}>
                      <Text style={styles.regularBadgeText}>خبر عام</Text>
                    </View>
                    {item.cover_image_url ? (
                      <View style={styles.mediaTypeBadge}>
                        <Ionicons name="image-outline" size={12} color="#0284C7" />
                        <Text style={styles.mediaTypeBadgeText}>مرفق درايف</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardTimeText}>اليوم</Text>
                </View>

                <Text style={styles.adminNewsTitle}>{item.title}</Text>
                <Text style={styles.adminNewsSummary} numberOfLines={2}>
                  {item.summary}
                </Text>

                <View style={styles.adminNewsFooter}>
                  <View style={styles.authorBadgeCol}>
                    <View style={styles.authorBadgeRow}>
                      <Text style={styles.authorNameText}>
                        الناشر: {item.author_display_name || 'الإدارة'}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    </View>
                    <View style={styles.roleMiniTag}>
                      <Ionicons name="shield-checkmark" size={10} color="#973c00" />
                      <Text style={styles.authorRoleSubText}>
                        {item.author_badge_label || (item.author_is_verified ? 'المشرف العام' : 'إدارة النشر')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionsBtnRow}>
                    <Pressable
                      style={styles.viewNewsBtn}
                      onPress={() => setSelectedNews(item)}>
                      <Ionicons name="eye-outline" size={16} color="#0284C7" />
                      <Text style={styles.viewNewsBtnText}>معاينة</Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteNewsBtn}
                      disabled={deletingId === item.id}
                      onPress={() => handleDeleteNews(item.id, item.title)}>
                      {deletingId === item.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          <Text style={styles.deleteNewsBtnText}>حذف</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* مودال معاينة الخبر بتفاصيله الكاملة */}
      {selectedNews && (
        <Modal
          visible={!!selectedNews}
          animationType="slide"
          onRequestClose={() => setSelectedNews(null)}>
          <NewsDetailScreen
            newsId={selectedNews.id}
            initialItem={selectedNews}
            onClose={() => setSelectedNews(null)}
          />
        </Modal>
      )}

      {/* مودال ربط وتفعيل مساحة Google Drive 5TB */}
      <Modal
        visible={showDriveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDriveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.driveModalContent}>
            <View style={styles.driveModalHeader}>
              <View style={styles.driveModalTitleRow}>
                <Ionicons name="logo-google" size={22} color="#973c00" />
                <Text style={styles.driveModalTitle}>ربط سحابة Google Drive (5 تيرا)</Text>
              </View>
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setShowDriveModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.rcloneFastBox}>
                <View style={styles.rcloneBadgeRow}>
                  <Ionicons name="flash" size={18} color="#973c00" />
                  <Text style={styles.rcloneFastTitle}>طريقة Rclone السريعة بنقرة واحدة (موصى بها):</Text>
                </View>
                <Text style={styles.rcloneFastText}>
                  تم وضع ملف تشغيلي على سطح المكتب لجهازك باسم:
                </Text>
                <View style={styles.batFilePill}>
                  <Ionicons name="terminal-outline" size={14} color="#0F172A" />
                  <Text style={styles.batFilePillText}>ربط_سحابة_جوجل_درايف_Rclone.bat</Text>
                </View>
                <Text style={styles.rcloneFastText}>
                  اضغط عليه مرتين على جهاز الكمبيوتر وسيفتح لك المتصفح فوراً، اختر حساب جوجل الـ 5 تيرا واضغط (Allow / متابعة)، وسيتم ربط وتفعيل السحابة تلقائياً!
                </Text>
              </View>

              <View style={styles.driveGuideBox}>
                <Text style={styles.driveGuideTitle}>أو عبر مفتاح Service Account JSON يدوياً:</Text>
                <Text style={styles.driveGuideStep}>
                  ١. من Google Cloud Console، أنشئ حساب خدمة (Service Account) مجاني.
                </Text>
                <Text style={styles.driveGuideStep}>
                  ٢. فعّل خدمة Google Drive API لمشروعك السحابي.
                </Text>
                <Text style={styles.driveGuideStep}>
                  ٣. اضغط مفاتيح (Keys) ثم Create Key ونزّل المفتاح بصيغة JSON.
                </Text>
                <Text style={styles.driveGuideStep}>
                  ٤. الصق محتوى ملف JSON في المربع أدناه واضغط "تفعيل سحابة Google Drive".
                </Text>
                <Text style={styles.driveGuideStep}>
                  ٥. افتح Google Drive وشارك مجلد «Elmansheya» مع إيميل الـ Service Account بصلاحية محرر (Editor).
                </Text>
              </View>

              <Text style={styles.inputLabelText}>الصق محتوى ملف المفتاح JSON:</Text>
              <TextInput
                style={styles.driveJsonInput}
                multiline
                numberOfLines={7}
                textAlignVertical="top"
                placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "..."\n}'}
                placeholderTextColor="#94A3B8"
                value={driveJsonInput}
                onChangeText={setDriveJsonInput}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.saveDriveBtn,
                  savingDrive && { opacity: 0.7 },
                  pressed && { opacity: 0.9 },
                ]}
                disabled={savingDrive}
                onPress={handleSaveDriveCredentials}>
                {savingDrive ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-done-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.saveDriveBtnText}>تفعيل سحابة Google Drive الآن</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  topHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUserInfo: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#973c00',
  },
  userNameBlock: {
    alignItems: 'flex-start',
  },
  nameWithBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  userFullName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  roleTag: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#973c00',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemStatusGrid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusPill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statsRow: {
    flexDirection: rtlFlexDirection,
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  publishActionHero: {
    backgroundColor: '#973c00',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#973c00',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  publishHeroInner: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  publishHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishHeroTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  publishHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  publishHeroSub: {
    fontSize: 11.5,
    color: '#FED7AA',
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 16,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 10,
  },
  modulesGrid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  moduleItem: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  moduleItemDesc: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 15,
  },
  feedHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
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
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  newsListWrap: {
    gap: 12,
  },
  breakingItemCard: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  breakingBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  breakingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'right',
  },
  deleteMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  adminNewsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  adminNewsCardHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBadgeRow: {
    flexDirection: rtlFlexDirection,
    gap: 6,
  },
  pinnedBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  pinnedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#973c00',
  },
  regularBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  regularBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  mediaTypeBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mediaTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0284C7',
  },
  cardTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  adminNewsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 4,
  },
  adminNewsSummary: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 10,
  },
  adminNewsFooter: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  authorBadgeCol: {
    alignItems: 'flex-start',
    gap: 2,
  },
  authorBadgeRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  roleMiniTag: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: '#FED7AA',
  },
  authorRoleSubText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#973c00',
    textAlign: 'right',
  },
  authorNameText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionsBtnRow: {
    flexDirection: rtlFlexDirection,
    gap: 8,
  },
  viewNewsBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  viewNewsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  deleteNewsBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteNewsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  // بطاقات حالة سحابة جوجل درايف
  driveStatusCardSuccess: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  driveStatusIconBoxSuccess: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveStatusCardWarning: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  driveStatusIconBoxWarning: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveStatusTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  driveStatusBadgeRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  driveStatusTitleSuccess: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'right',
  },
  driveStatusTitleWarning: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'right',
  },
  driveStatusSubSuccess: {
    fontSize: 11,
    color: '#15803D',
    textAlign: 'right',
    lineHeight: 16,
  },
  driveStatusSubWarning: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'right',
    lineHeight: 16,
  },
  driveEmailText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  greenActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  yellowPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  connectDriveBtnPill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#973c00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  connectDriveBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  // مودال إعداد سحابة جوجل درايف
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  driveModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  driveModalHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  driveModalTitleRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  driveModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcloneFastBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  rcloneBadgeRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rcloneFastTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#973c00',
    textAlign: 'right',
  },
  rcloneFastText: {
    fontSize: 12,
    color: '#7C2D12',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 6,
  },
  batFilePill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  batFilePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  driveGuideBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  driveGuideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 8,
  },
  driveGuideStep: {
    fontSize: 11.5,
    color: '#334155',
    textAlign: 'right',
    lineHeight: 19,
    marginBottom: 4,
  },
  inputLabelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 6,
  },
  driveJsonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
    minHeight: 120,
    textAlign: 'left',
  },
  saveDriveBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#973c00',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 20,
  },
  saveDriveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
