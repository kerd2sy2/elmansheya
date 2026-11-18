import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  I18nManager,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { rtlAlignItems, rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { getDirectImageUrl, getDirectVideoUrl } from '@/core/utils/googleDrive';
import { NewsCardItem } from '../types/news.types';
import { parseAuthorInfo } from '../components/SmallNewsCard';

interface NewsDetailScreenProps {
  newsId: string;
  initialItem?: NewsCardItem | null;
  onClose?: () => void;
}

function formatPublishDetails(isoString?: string): { time: string; date: string } {
  if (!isoString) return { time: '', date: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { time: '', date: isoString };
    const time = d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const date = d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return { time, date };
  } catch {
    return { time: '', date: isoString };
  }
}

export function NewsDetailScreen({
  newsId,
  initialItem,
  onClose,
}: NewsDetailScreenProps) {
  const topInset = useSafeTopInset();
  const [item, setItem] = useState<NewsCardItem | null>(initialItem ?? null);
  const [loading, setLoading] = useState<boolean>(!initialItem);
  const [error, setError] = useState<string | null>(null);

  // إدارة زر الرجوع في أندرويد
  useEffect(() => {
    if (!onClose) return;

    const onBack = () => {
      onClose();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      if (!newsId) return;
      try {
        const res = await fetchModuleData<NewsCardItem>(
          'news',
          `/news/detail?id=${encodeURIComponent(newsId)}`,
          {
            cooldownMs: 0,
            fallbackData: initialItem ?? ({} as NewsCardItem),
          }
        );
        if (isMounted) {
          if (res.ok && res.data && res.data.id) {
            setItem(res.data);
          } else if (!item) {
            setError('تعذر تحميل تفاصيل الخبر، يرجى المحاولة لاحقاً');
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          if (!item) {
            setError('تعذر الاتصال بالخادم');
          }
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [newsId]);

  // مشاركة رابط الخبر عبر الدومين الرسمي فقط (بدون روابط محلية)
  const handleShare = async () => {
    if (!item) return;
    try {
      const webUrl = `https://elmansheya.kerd2sy.com/news/${item.id}`;
      await Share.share({
        title: item.title,
        message: `${item.title}\n\nتابع تفاصيل الخبر عبر الرابط:\n${webUrl}`,
        url: webUrl,
      });
    } catch {
      // تم إلغاء المشاركة
    }
  };

  const { time, date } = formatPublishDetails(item?.published_at);
  const directCoverUrl = getDirectImageUrl(item?.cover_image_url);
  const directAvatarUrl = getDirectImageUrl(item?.author_avatar_url);
  const directVideoUrl = getDirectVideoUrl(item?.video_stream_url);

  const { cleanName, roleTitle } = parseAuthorInfo(
    item?.author_display_name || '',
    item?.author_badge_label,
    item?.title
  );

  const handlePlayVideo = async () => {
    if (directVideoUrl) {
      try {
        await WebBrowser.openBrowserAsync(directVideoUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#973c00',
          controlsColor: '#FFFFFF',
          showTitle: true,
          enableBarCollapsing: true,
        });
      } catch {
        await Linking.openURL(directVideoUrl).catch(() => {});
      }
    }
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* هيدر حديث ومنظم وعصري */}
      <View style={styles.topBar}>
        {onClose ? (
          <Pressable
            style={styles.circleButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="رجوع">
            <Ionicons
              name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color="#0F172A"
            />
          </Pressable>
        ) : (
          <View style={styles.placeholderBox} />
        )}

        <Text style={styles.topBarTitle}>تفاصيل المنشور</Text>

        <Pressable
          style={[styles.circleButton, styles.shareCircleButton]}
          onPress={handleShare}
          hitSlop={8}
          accessibilityLabel="مشاركة">
          <Ionicons name="share-social-outline" size={20} color="#973c00" />
        </Pressable>
      </View>

      {loading && !item ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#973c00" />
          <Text style={styles.loadingText}>جاري تحميل الخبر بالكامل...</Text>
        </View>
      ) : error && !item ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          {onClose ? (
            <Pressable style={styles.retryBtn} onPress={onClose}>
              <Text style={styles.retryBtnText}>العودة للأخبار</Text>
            </Pressable>
          ) : null}
        </View>
      ) : item ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          canCancelContentTouches={true}
          directionalLockEnabled={false}
          overScrollMode="always">
          {/* غلاف المنشور أو وسائط الفيديو من جوجل درايف أو الروابط المباشرة */}
          {directCoverUrl ? (
            <Pressable
              style={styles.mediaContainer}
              disabled={!directVideoUrl}
              onPress={handlePlayVideo}>
              <Image
                source={{ uri: directCoverUrl }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
              />
              {directVideoUrl ? (
                <View style={styles.mediaBadgeOverlay}>
                  <Ionicons name="videocam" size={14} color="#FFFFFF" />
                  <Text style={styles.mediaBadgeText}>تشغيل الفيديو</Text>
                </View>
              ) : null}
            </Pressable>
          ) : directVideoUrl ? (
            <Pressable style={styles.videoOnlyBanner} onPress={handlePlayVideo}>
              <View style={styles.playCircle}>
                <Ionicons name="play" size={26} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>
              <Text style={styles.videoOnlyBannerText}>اضغط لتشغيل الفيديو المرفق</Text>
            </Pressable>
          ) : null}

          <View style={styles.bodyWrap}>
            {/* شارة الخبر المثبت إن وجد */}
            {item.is_pinned ? (
              <View style={styles.pinnedRow}>
                <View style={styles.pinnedBadge}>
                  <Ionicons name="bookmark" size={13} color="#0369A1" />
                  <Text style={styles.pinnedBadgeText}>خبر رئيسي مثبت</Text>
                </View>
              </View>
            ) : null}

            {/* العنوان يبدأ بدقة من اليمين إلى اليسار */}
            <Text style={styles.title}>{item.title}</Text>

            {/* شريط البيانات: التاريخ، الوقت، والمشاهدات في مكانها الصحيح والمرتب */}
            <View style={styles.metadataBar}>
              {date ? (
                <View style={styles.metadataItem}>
                  <Ionicons name="calendar-outline" size={13.5} color="#64748B" />
                  <Text style={styles.metadataText}>{date}</Text>
                </View>
              ) : null}

              {time ? (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <View style={styles.metadataItem}>
                    <Ionicons name="time-outline" size={13.5} color="#64748B" />
                    <Text style={styles.metadataText}>{time}</Text>
                  </View>
                </>
              ) : null}

              <Text style={styles.metadataDot}>•</Text>
              <View style={styles.metadataItem}>
                <Ionicons name="eye-outline" size={13.5} color="#973c00" />
                <Text style={[styles.metadataText, styles.viewsHighlight]}>
                  {item.views_count} مشاهدة
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* نص وبراجراف المنشور يبدأ بدقة من اليمين إلى اليسار */}
            <Text style={styles.articleBody}>{item.summary}</Text>

            <View style={styles.divider} />

            {/* بطاقة كاتب المنشور في الأسفل تماماً */}
            <View style={styles.bottomAuthorCard}>
              <View style={styles.authorSectionHeader}>
                <Ionicons name="create-outline" size={15} color="#973c00" />
                <Text style={styles.authorSectionHeaderText}>ناشر الخبر</Text>
              </View>

              <View style={styles.authorRow}>
                {directAvatarUrl ? (
                  <Image
                    source={{ uri: directAvatarUrl }}
                    style={styles.authorAvatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.authorAvatarFallback}>
                    <Ionicons name="person" size={20} color="#973c00" />
                  </View>
                )}

                <View style={styles.authorInfoCol}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorNameText}>{cleanName}</Text>
                    {item.author_is_verified ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#0284C7" />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.authorRoleRow}>
                    <Text style={styles.authorRoleText}>
                      {roleTitle}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* زر مشاركة الرابط أسفل الصفحة */}
            <Pressable style={styles.bottomShareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
              <Text style={styles.bottomShareBtnText}>مشاركة رابط الخبر</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  topBar: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF5EE',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shareCircleButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  placeholderBox: {
    width: 38,
    height: 38,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#973c00',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  mediaBadgeOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  videoOnlyBanner: {
    height: 160,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOnlyBannerText: {
    color: '#F1F5F9',
    fontSize: 13.5,
    fontWeight: '700',
  },
  bodyWrap: {
    paddingHorizontal: 18,
    paddingTop: 16,
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
  pinnedRow: {
    flexDirection: rtlFlexDirection,
    marginBottom: 8,
  },
  pinnedBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pinnedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 31,
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  metadataBar: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: I18nManager.isRTL ? 'flex-start' : 'flex-end',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  metadataItem: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  metadataDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  viewsHighlight: {
    color: '#973c00',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
    width: '100%',
  },
  articleBody: {
    fontSize: 15.5,
    color: '#334155',
    lineHeight: 27,
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    width: '100%',
    alignSelf: 'stretch',
  },
  bottomAuthorCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
  },
  authorSectionHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  authorSectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  authorRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  authorAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfoCol: {
    flex: 1,
    alignItems: rtlAlignItems,
    justifyContent: 'center',
  },
  authorNameRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorNameText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  authorRoleRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    marginTop: 2,
  },
  authorRoleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  bottomShareBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
    elevation: 2,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  bottomShareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
