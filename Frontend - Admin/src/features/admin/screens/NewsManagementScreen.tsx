import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useSafeBottomTabPadding, useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useAuth } from '@/features/auth/context/AuthContext';
import { canAccessSection } from '@/core/permissions/adminRoles';
import { API_BASE_URL } from '@/core/config/api.config';
import { useNewsFeed } from '@/features/news/hooks/useNewsFeed';
import { InlineDriveVideoPlayer } from '../components/InlineDriveVideoPlayer';

// دالة ذكية لتحويل أي رابط مشاركة من Google Drive أو السيرفر إلى رابط استعراض فائق السرعة
function parseDriveLink(rawUrl: string): { directUrl: string; isDrive: boolean } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { directUrl: '', isDrive: false };

  // استخراج ID الملف من روابط: /file/d/FILE_ID/view أو ?id=FILE_ID
  const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return {
      directUrl: `https://lh3.googleusercontent.com/d/${matchFile[1]}`,
      isDrive: true,
    };
  }

  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return {
      directUrl: `https://lh3.googleusercontent.com/d/${matchId[1]}`,
      isDrive: true,
    };
  }

  return { directUrl: trimmed, isDrive: false };
}

export function NewsManagementScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const router = useRouter();
  const { user, token } = useAuth();
  const { feed, refresh } = useNewsFeed();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [driveImageUrl, setDriveImageUrl] = useState('');
  const [driveVideoUrl, setDriveVideoUrl] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // حالة الرفع السحابي اللحظي
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [savedFolderNotice, setSavedFolderNotice] = useState<string>('');

  const hasPermission = canAccessSection(user?.role, 'news');

  if (!hasPermission) {
    return (
      <View style={[styles.unauthorizedBox, { paddingTop: topInset + 40 }]}>
        <Ionicons name="lock-closed-outline" size={48} color="#DC2626" />
        <Text style={styles.unauthorizedTitle}>غير مصرح لك بدخول استوديو النشر</Text>
        <Text style={styles.unauthorizedDesc}>
          هذا القسم مخصص حصرياً لـ «المشرف العام» و«مساعد الإعلام والمناسبات».
        </Text>
      </View>
    );
  }

  const parsedImage = parseDriveLink(driveImageUrl);

  // دالة الرفع التلقائي إلى مجلدات المنظومة
  const uploadLocalFile = async (
    fileUri: string,
    mediaType: 'image' | 'video',
    originalFilename: string,
    base64Data?: string | null
  ) => {
    setUploading(true);
    setUploadProgressText(
      mediaType === 'image'
        ? 'جاري رفع وتخزين الصورة في مجلد [الأخبار والتغطيات / صور]...'
        : 'جاري رفع وتخزين الفيديو في مجلد [الأخبار والتغطيات / فيديوهات]...'
    );

    try {
      const filename = originalFilename || (mediaType === 'image' ? 'photo.jpg' : 'video.mp4');
      let json: any = null;
      let isSuccess = false;

      // ١. إذا كانت الصورة متوفرة كـ Base64، نرفعها كـ JSON مباشرة (أضمن وأسرع طريقة في React Native)
      if (base64Data) {
        const uploadRes = await fetch(`${API_BASE_URL}/storage/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            base64: base64Data,
            filename,
            section: 'news',
            media_type: mediaType,
          }),
        });
        json = await uploadRes.json();
        isSuccess = uploadRes.ok && Boolean(json?.success);
      } else if (Platform.OS !== 'web') {
        // ٢. إذا كان ملف فيديو على هاتف محمول (أندرويد أو آيفون):
        // نستخدم FileSystem.uploadAsync الأصيل من Expo لمنع خطأ Unsupported FormDataPart implementation
        const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
        const uploadResult = await FileSystem.uploadAsync(
          `${API_BASE_URL}/storage/upload?section=news&media_type=${mediaType}`,
          fileUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType,
            parameters: {
              section: 'news',
              media_type: mediaType,
            },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        try {
          json = JSON.parse(uploadResult.body);
        } catch {
          json = null;
        }
        isSuccess = uploadResult.status >= 200 && uploadResult.status < 300 && Boolean(json?.success);
      } else {
        // ٣. على بيئة المتصفح (Web Browser)
        const resp = await fetch(fileUri);
        const blob = await resp.blob();
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('section', 'news');
        formData.append('media_type', mediaType);

        const uploadRes = await fetch(
          `${API_BASE_URL}/storage/upload?section=news&media_type=${mediaType}`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          }
        );
        json = await uploadRes.json();
        isSuccess = uploadRes.ok && Boolean(json?.success);
      }

      if (isSuccess && json?.data?.url) {
        if (mediaType === 'image') {
          setDriveImageUrl(json.data.url);
        } else {
          setDriveVideoUrl(json.data.url);
        }
        setSavedFolderNotice(json.data.folder_path || 'Elmansheya/الأخبار_والتغطيات');
        
        if (json.data.is_drive) {
          Alert.alert(
            '☁️ تم الرفع مباشرة إلى Google Drive (5 تيرا)',
            `تم حفظ الملف بنجاح على سحابتك في:\n${json.data.folder_path}\n\nتم إدراج رابط البث السحابي فائق السرعة وتحديث المعاينة فوراً (ضغط وتخزين السيرفر 0%).`
          );
        } else {
          Alert.alert(
            '⚠️ تم الحفظ مؤقتاً على السيرفر',
            `تم حفظ الملف مؤقتاً في مسار المنظومة:\n${json.data.folder_path}`
          );
        }
      } else {
        Alert.alert('فشل الرفع', json?.error?.message || json?.error || 'تعذر رفع الملف.');
      }
    } catch (err: any) {
      console.warn('[uploadLocalFile] Error:', err);
      Alert.alert('خطأ في الاتصال', `تعذر رفع الملف إلى السيرفر (${err?.message || 'تأكد من تشغيل الشبكة'}).`);
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  // ١. التقاط صورة مباشرة بكاميرا الهاتف
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'يرجى السماح للتطبيق بالوصول للكاميرا لالتقاط صورة الخبر.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets[0]) {
        await uploadLocalFile(
          res.assets[0].uri,
          'image',
          res.assets[0].fileName || `cam_${Date.now()}.jpg`,
          res.assets[0].base64
        );
      }
    } catch {
      Alert.alert('خطأ', 'تعذر فتح الكاميرا.');
    }
  };

  // ٢. اختيار صورة من ألبوم ومعرض الهاتف
  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'يرجى السماح للتطبيق بالوصول للصور.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets[0]) {
        await uploadLocalFile(
          res.assets[0].uri,
          'image',
          res.assets[0].fileName || `gallery_${Date.now()}.jpg`,
          res.assets[0].base64
        );
      }
    } catch {
      Alert.alert('خطأ', 'تعذر فتح المعرض.');
    }
  };

  // ٣. اختيار فيديو من الهاتف
  const handlePickVideo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'يرجى السماح للتطبيق بالوصول للفيديوهات.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        await uploadLocalFile(
          res.assets[0].uri,
          'video',
          res.assets[0].fileName || `video_${Date.now()}.mp4`
        );
      }
    } catch {
      Alert.alert('خطأ', 'تعذر اختيار الفيديو.');
    }
  };

  // زر النشر والتعميم في تطبيق المواطن
  const handlePublish = async () => {
    if (!title.trim() || !summary.trim()) {
      Alert.alert('بيانات ناقصة', 'يرجى كتابة عنوان الخبر وتفاصيله.');
      return;
    }

    setLoading(true);
    try {
      const finalImageUrl = parsedImage.directUrl || driveImageUrl.trim();
      const finalVideoUrl = driveVideoUrl.trim();

      const res = await fetch(`${API_BASE_URL}/news/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          cover_image_url: finalImageUrl,
          video_stream_url: finalVideoUrl,
          author_display_name: user?.full_name ?? 'إدارة المنشية',
          author_is_verified: true,
          author_badge_label: user?.role === 'super_admin' ? 'المشرف العام' : 'مساعد إعلام معتمد',
          is_breaking: isBreaking,
          is_pinned_featured: isPinned,
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (res.ok && json.success) {
        Alert.alert('✅ تم النشر بنجاح', 'تم إرسال ونشر الخبر فوراً في تطبيق المواطنين.');
        setTitle('');
        setSummary('');
        setDriveImageUrl('');
        setDriveVideoUrl('');
        setSavedFolderNotice('');
        setIsBreaking(false);
        setIsPinned(false);
        refresh();
      } else {
        Alert.alert('خطأ في النشر', json?.error?.message ?? 'تعذر نشر الخبر.');
      }
    } catch {
      setLoading(false);
      Alert.alert('خطأ في الاتصال', 'تعذر الاتصال بالخادم، تأكد من تشغيل الشبكة.');
    }
  };

  const handleDeleteNews = (id: string, itemTitle: string) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف خبر: "${itemTitle}" نهائياً من تطبيق المواطنين؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف',
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
              Alert.alert('خطأ', 'تعذر الاتصال بالخادم.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
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
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="newspaper" size={14} color="#973c00" />
              <Text style={styles.roleBadgeText}>استوديو النشر والإعلام</Text>
            </View>
            <View style={styles.driveBadge}>
              <Ionicons name="folder" size={13} color="#2563EB" />
              <Text style={styles.driveBadgeText}>مجلد: تطبيق المنشية</Text>
            </View>
          </View>
          <Text style={styles.screenTitle}>نشر خبر أو بيان جديد للقرية</Text>
          <Text style={styles.screenDesc}>
            يمكنك التصوير المباشر بالكاميرا أو اختيار الصور والفيديوهات، وسيتم تخزينها تلقائياً داخل مجلد المنظومة المقسم ووضع الرابط تلقائياً.
          </Text>
        </View>

        {/* بطاقة نموذج الإدخال */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>عنوان الخبر أو الفعالية *</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: موعد صلاة الجنازة وتشييع الجثمان اليوم..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />

          <Text style={styles.fieldLabel}>تفاصيل وتغطية الخبر بالكامل *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب تفاصيل الخبر كاملة وموعد ومكان الحدث لأهالي المنشية..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={5}
            value={summary}
            onChangeText={setSummary}
            textAlign="right"
          />

          {/* أزرار الرفع والالتقاط المباشر بالكاميرا أو المعرض */}
          <View style={styles.mediaUploadSection}>
            <Text style={styles.fieldLabel}>إرفاق صورة الخبر (تصوير أو رفع فوري):</Text>

            <View style={styles.mediaButtonsGrid}>
              <Pressable
                style={[styles.mediaActionBtn, { backgroundColor: '#973c00' }]}
                disabled={uploading}
                onPress={handleTakePhoto}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.mediaActionBtnText}>التقاط بالكاميرا</Text>
              </Pressable>

              <Pressable
                style={[styles.mediaActionBtn, { backgroundColor: '#0284C7' }]}
                disabled={uploading}
                onPress={handlePickFromGallery}>
                <Ionicons name="images" size={18} color="#FFFFFF" />
                <Text style={styles.mediaActionBtnText}>اختيار من المعرض</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.videoActionBtn, { backgroundColor: '#6366F1' }]}
              disabled={uploading}
              onPress={handlePickVideo}>
              <Ionicons name="videocam" size={18} color="#FFFFFF" />
              <Text style={styles.mediaActionBtnText}>اختيار فيديو تغطية من الهاتف (MP4)</Text>
            </Pressable>

            {uploading && (
              <View style={styles.uploadingBox}>
                <ActivityIndicator size="small" color="#973c00" />
                <Text style={styles.uploadingText}>{uploadProgressText}</Text>
              </View>
            )}

            {savedFolderNotice ? (
              <View style={styles.savedFolderPill}>
                <Ionicons name="checkmark-done" size={14} color="#16A34A" />
                <Text style={styles.savedFolderText}>
                  المسار السحابي: {savedFolderNotice}
                </Text>
              </View>
            ) : null}
          </View>

          {/* صندوق الرابط التلقائي (يوضع تلقائياً أو يمكن إدخال رابط يدوي) */}
          <View style={styles.driveInputHeader}>
            <Text style={styles.subFieldLabel}>رابط الصورة المباشر (يوضع تلقائياً بعد التصوير أو الرفع):</Text>
          </View>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            placeholder="سيظهر الرابط المباشر هنا فور التقاط أو اختيار الصورة..."
            placeholderTextColor="#94A3B8"
            value={driveImageUrl}
            onChangeText={setDriveImageUrl}
            textAlign="left"
            autoCapitalize="none"
          />

          {/* معاينة الصورة المباشرة عند توفر رابط */}
          {parsedImage.directUrl ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: parsedImage.directUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewOverlay}>
                <Ionicons name="eye" size={14} color="#FFFFFF" />
                <Text style={styles.previewOverlayText}>معاينة الصورة المرفوعة</Text>
              </View>
            </View>
          ) : null}

          {/* رابط الفيديو المباشر */}
          <View style={styles.driveInputHeader}>
            <Text style={styles.subFieldLabel}>رابط الفيديو المباشر (يوضع تلقائياً بعد اختيار الفيديو):</Text>
          </View>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            placeholder="سيظهر رابط الفيديو هنا فور اختياره..."
            placeholderTextColor="#94A3B8"
            value={driveVideoUrl}
            onChangeText={setDriveVideoUrl}
            textAlign="left"
            autoCapitalize="none"
          />

          {driveVideoUrl ? (
            <InlineDriveVideoPlayer
              videoUrl={driveVideoUrl}
              coverImageUrl={parsedImage.directUrl || driveImageUrl}
              height={200}
            />
          ) : null}

          {/* خيارات التثبيت والأخبار العاجلة */}
          <View style={styles.optionsDivider} />

          <View style={styles.switchRow}>
            <Switch
              value={isPinned}
              onValueChange={setIsPinned}
              trackColor={{ false: '#CBD5E1', true: '#FED7AA' }}
              thumbColor={isPinned ? '#973c00' : '#F1F5F9'}
            />
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>تثبيت كخبر رئيسي في أعلى الشاشة</Text>
              <Text style={styles.switchSubLabel}>يظهر في بطاقة بارزة بقمة التطبيق لكل المواطنين</Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Switch
              value={isBreaking}
              onValueChange={setIsBreaking}
              trackColor={{ false: '#CBD5E1', true: '#FED7AA' }}
              thumbColor={isBreaking ? '#973c00' : '#F1F5F9'}
            />
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>إدراج في شريط الأخبار العاجلة الأحمر</Text>
              <Text style={styles.switchSubLabel}>يظهر فوراً في الشريط المتحرك السريع أعلى الشاشة</Text>
            </View>
          </View>

          {/* زر النشر والاعتماد */}
          <Pressable
            style={[styles.publishBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handlePublish}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>نشر وتعميم الخبر في تطبيق المواطن الآن</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* قسم الأخبار المنشورة حالياً مع إمكانية حذف أي منها */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.recentTitle}>منشورات القرية الحالية</Text>
          <Pressable onPress={() => refresh()} style={styles.recentRefreshBtn}>
            <Ionicons name="refresh" size={16} color="#64748B" />
          </Pressable>
        </View>

        <View style={styles.recentListWrap}>
          {feed?.pinned_featured?.map((item) => (
            <View key={`pf-${item.id}`} style={styles.recentCard}>
              <View style={styles.recentCardHeader}>
                <View style={styles.recentBadgePinned}>
                  <Text style={styles.recentBadgePinnedText}>مثبت</Text>
                </View>
                <Text style={styles.recentCardTime}>اليوم</Text>
              </View>
              <Text style={styles.recentCardTitle}>{item.title}</Text>
              <Text style={styles.recentCardSummary} numberOfLines={2}>{item.summary}</Text>
              <View style={styles.recentCardFooter}>
                <Text style={styles.recentCardAuthor}>الناشر: {item.author_display_name}</Text>
                <Pressable
                  style={styles.recentDeleteBtn}
                  disabled={deletingId === item.id}
                  onPress={() => handleDeleteNews(item.id, item.title)}>
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={styles.recentDeleteBtnText}>حذف</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}

          {feed?.small_news?.map((item) => (
            <View key={`sm-${item.id}`} style={styles.recentCard}>
              <View style={styles.recentCardHeader}>
                <View style={styles.recentBadgeRegular}>
                  <Text style={styles.recentBadgeRegularText}>خبر</Text>
                </View>
                <Text style={styles.recentCardTime}>اليوم</Text>
              </View>
              <Text style={styles.recentCardTitle}>{item.title}</Text>
              <Text style={styles.recentCardSummary} numberOfLines={2}>{item.summary}</Text>
              <View style={styles.recentCardFooter}>
                <Text style={styles.recentCardAuthor}>الناشر: {item.author_display_name}</Text>
                <Pressable
                  style={styles.recentDeleteBtn}
                  disabled={deletingId === item.id}
                  onPress={() => handleDeleteNews(item.id, item.title)}>
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={styles.recentDeleteBtnText}>حذف</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
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
    lineHeight: 20,
    maxWidth: 320,
  },
  headerBox: {
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: rtlFlexDirection,
    gap: 8,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  driveBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  driveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 10,
  },
  subFieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 4,
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
  readOnlyInput: {
    fontSize: 11.5,
    color: '#475569',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  mediaUploadSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  mediaButtonsGrid: {
    flexDirection: rtlFlexDirection,
    gap: 10,
    marginBottom: 8,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  videoActionBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  mediaActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadingBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#973c00',
  },
  savedFolderPill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  savedFolderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  driveInputHeader: {
    marginTop: 6,
  },
  previewContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  previewOverlayText: {
    fontSize: 10.5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewVideoBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  previewVideoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  optionsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchTextCol: {
    flex: 1,
    alignItems: 'flex-start',
    marginLeft: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },
  switchSubLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  publishBtn: {
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
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  recentSectionHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentListWrap: {
    gap: 10,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentCardHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentBadgePinned: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  recentBadgePinnedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#973c00',
  },
  recentBadgeRegular: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentBadgeRegularText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  recentCardTime: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  recentCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  recentCardSummary: {
    fontSize: 11.5,
    color: '#475569',
    textAlign: 'right',
    marginTop: 2,
  },
  recentCardFooter: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  recentCardAuthor: {
    fontSize: 11,
    color: '#64748B',
  },
  recentDeleteBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recentDeleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
