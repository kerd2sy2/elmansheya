import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { NewsCardItem } from '../types/news.types';

interface NewsDetailScreenProps {
  newsId: string;
  initialItem?: NewsCardItem | null;
  onClose?: () => void;
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

  // زر الرجوع في الأندرويد يغلق تفاصيل الخبر
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

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${item.summary}\n\n— تطبيق المنشية`,
      });
    } catch {
      // تجاهل إلغاء المشاركة
    }
  };

  const formattedDate = item?.published_at
    ? new Date(item.published_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* شريط العنوان العلوي وأزرار التحكم */}
      <View style={styles.topBar}>
        {onClose ? (
          <Pressable style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-forward" size={20} color="#0F172A" />
            <Text style={styles.backButtonText}>رجوع</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}

        <Text style={styles.topBarTitle}>تفاصيل الخبر</Text>

        <Pressable style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={19} color="#973c00" />
          <Text style={styles.shareButtonText}>مشاركة</Text>
        </Pressable>
      </View>

      {loading && !item ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#973c00" />
          <Text style={styles.loadingText}>جاري تحميل الخبر بالكامل...</Text>
        </View>
      ) : error && !item ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
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
          showsVerticalScrollIndicator={false}>
          {/* صورة الخبر إن وجدت */}
          {item.cover_image_url ? (
            <Image
              source={{ uri: item.cover_image_url }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : null}

          <View style={styles.contentCard}>
            {/* الشارات: عاجل أو مثبت */}
            <View style={styles.badgesRow}>
              {item.is_pinned ? (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="bookmark" size={13} color="#0369A1" />
                  <Text style={styles.pinnedBadgeText}>خبر رئيسي مثبت</Text>
                </View>
              ) : null}

              <View style={styles.viewsBadge}>
                <Ionicons name="eye-outline" size={14} color="#64748B" />
                <Text style={styles.viewsBadgeText}>
                  {item.views_count} مشاهدة
                </Text>
              </View>
            </View>

            {/* عنوان الخبر */}
            <Text style={styles.title}>{item.title}</Text>

            {/* بيانات الناشر والتاريخ */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#475569"
                />
                <Text style={styles.metaText}>
                  الناشر: {item.author_display_name}
                </Text>
              </View>

              {formattedDate ? (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={15} color="#64748B" />
                  <Text style={styles.metaText}>{formattedDate}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* نص الخبر بالكامل */}
            <Text style={styles.articleBody}>{item.summary}</Text>

            <View style={styles.footerNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#059669"
              />
              <Text style={styles.footerNoteText}>
                منشور عبر إدارة تطبيق المنشية الرسمية
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  shareButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#973c00',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 5,
  },
  coverImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#E2E8F0',
  },
  contentCard: {
    padding: 16,
  },
  badgesRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pinnedBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pinnedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  viewsBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  viewsBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 32,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  articleBody: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 24,
  },
  footerNote: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
  },
  footerNoteText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '700',
    textAlign: 'right',
  },
});
