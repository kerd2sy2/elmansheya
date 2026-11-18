import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { I18nManager, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { getDirectImageUrl, getDirectVideoUrl } from '@/core/utils/googleDrive';
import { NewsCardItem } from '../types/news.types';
import { parseAuthorInfo } from './SmallNewsCard';

interface FeaturedNewsCardProps {
  item: NewsCardItem;
  onPress?: (item: NewsCardItem) => void;
}

function formatPublishTimeAndDate(isoString: string): { time: string; date: string } {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { time: '', date: isoString };
    }
    const time = d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const date = d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return { time, date };
  } catch {
    return { time: '', date: isoString };
  }
}

export const FeaturedNewsCard = React.memo(function FeaturedNewsCard({
  item,
  onPress,
}: FeaturedNewsCardProps) {
  const { time, date } = formatPublishTimeAndDate(item.published_at);
  const directCoverUrl = getDirectImageUrl(item.cover_image_url);
  const directAvatarUrl = getDirectImageUrl(item.author_avatar_url);
  const directVideoUrl = getDirectVideoUrl(item.video_stream_url);
  const hasVideo = Boolean(directVideoUrl);

  const { cleanName, roleTitle } = parseAuthorInfo(
    item.author_display_name,
    item.author_badge_label,
    item.title
  );

  const handleShare = async () => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${item.summary}\n— تطبيق المنشية`,
      });
    } catch {
      // تجاهل إلغاء المشاركة من المستخدم
    }
  };

  return (
    <View style={styles.card}>
      {directCoverUrl ? (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: directCoverUrl }}
            style={styles.coverImage}
            contentFit="cover"
          />
          {hasVideo ? (
            <View style={styles.videoPlayOverlay}>
              <View style={styles.playButtonCircle}>
                <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>
            </View>
          ) : null}
        </View>
      ) : hasVideo ? (
        <View style={styles.videoOnlyBox}>
          <View style={styles.playButtonCircle}>
            <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.videoOnlyLabel}>فيديو مميز مرفق مع الخبر</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.pinnedBadge}>
            <Ionicons name="bookmark-outline" size={14} color="#0369A1" />
            <Text style={styles.pinnedBadgeText}>خبر رئيسي مثبت</Text>
          </View>

          <View style={styles.viewsWrap}>
            <Ionicons name="eye-outline" size={15} color="#64748B" />
            <Text style={styles.viewsText}>{item.views_count}</Text>
          </View>
        </View>

        {/* كرت الناشر: الصورة والاسم وتحته وقت وتاريخ النشر */}
        <View style={styles.authorHeaderRow}>
          <View style={styles.authorRow}>
            {item.author_avatar_url ? (
              <Image
                source={{ uri: directAvatarUrl }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.authorAvatarFallback}>
                <Ionicons name="person" size={16} color="#973c00" />
              </View>
            )}
            <View style={styles.authorInfoCol}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{cleanName}</Text>
                {item.author_is_verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={15} color="#0284C7" />
                  </View>
                ) : null}
              </View>

              {/* الدور أو القسم باللون الأسود وبدون أيقونة وبدون بوكس/خلفية */}
              <View style={styles.authorRoleRow}>
                <Text style={styles.authorRoleText} numberOfLines={1}>
                  {roleTitle}
                </Text>
              </View>

              <View style={styles.dateTimeRow}>
                <Text style={styles.timeText}>{time}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.dateText}>{date}</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable style={styles.textContainer} onPress={() => onPress?.(item)}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.summary}>{item.summary}</Text>
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.readFullBtn}
            onPress={() => onPress?.(item)}>
            <Ionicons name="book-outline" size={16} color="#FFFFFF" />
            <Text style={styles.readFullBtnText}>قراءة كاملة</Text>
          </Pressable>

          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={16} color="#0F172A" />
            <Text style={styles.shareBtnText}>مشاركة</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 190,
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: 190,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  videoOnlyBox: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
  },
  videoOnlyLabel: {
    color: '#E2E8F0',
    fontSize: 13.5,
    fontWeight: '600',
  },
  body: {
    padding: 16,
  },
  topRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pinnedBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pinnedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  viewsWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    writingDirection: 'rtl',
  },
  authorHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 12,
    width: '100%',
  },
  authorRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  authorAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfoCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  authorNameRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  authorRoleRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    marginTop: 1,
    marginBottom: 2,
  },
  authorRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  dateTimeRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#94A3B8',
  },
  dateText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  textContainer: {
    width: '100%',
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginBottom: 8,
    lineHeight: 26,
    width: '100%',
    alignSelf: 'stretch',
  },
  summary: {
    fontSize: 14,
    color: '#475569',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 23,
    marginBottom: 14,
    width: '100%',
    alignSelf: 'stretch',
  },
  actionsRow: {
    flexDirection: rtlFlexDirection,
    gap: 10,
  },
  readFullBtn: {
    flex: 1,
    flexDirection: rtlFlexDirection,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingVertical: 10,
    borderRadius: 10,
  },
  readFullBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  shareBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
});
