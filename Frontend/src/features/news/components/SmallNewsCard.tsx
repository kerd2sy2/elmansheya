import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { getDirectImageUrl, getDirectVideoUrl } from '@/core/utils/googleDrive';
import { InlineDriveVideoPlayer } from './InlineDriveVideoPlayer';
import { NewsCardItem } from '../types/news.types';

interface SmallNewsCardProps {
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

export interface ParsedAuthor {
  cleanName: string;
  roleTitle: string;
}

export function parseAuthorInfo(
  rawName: string,
  rawRole?: string,
  newsTitle?: string
): ParsedAuthor {
  let cleanName = (rawName || 'إدارة قرية المنشية').trim();
  let entity = '';

  const match = cleanName.match(/\((.*?)\)/);
  if (match) {
    entity = match[1].trim();
    cleanName = cleanName.replace(/\(.*?\)/, '').trim();
  }

  // إذا تم تحديد دور مخصص من الباك إند
  if (rawRole && rawRole !== 'مشرف موثق') {
    return {
      cleanName,
      roleTitle: rawRole,
    };
  }

  // إذا كانت هناك جهة بين القوسين
  if (entity) {
    if (entity.includes('الصحة') || cleanName.includes('د.')) {
      return {
        cleanName,
        roleTitle: `مسؤول الصحة • ${entity}`,
      };
    }
    if (entity.includes('الزراعية') || entity.includes('الزراعة') || cleanName.includes('م.')) {
      return {
        cleanName,
        roleTitle: `مسؤول الزراعة • ${entity}`,
      };
    }
    return {
      cleanName,
      roleTitle: entity,
    };
  }

  // استنتاج الدور بناء على الكلمات المفتاحية
  const context = `${cleanName} ${newsTitle || ''}`;
  if (
    context.includes('إنارة') ||
    context.includes('كهرباء') ||
    context.includes('إصلاح') ||
    context.includes('صيانة') ||
    context.includes('مياه') ||
    context.includes('طريق')
  ) {
    return {
      cleanName,
      roleTitle: 'مسؤول الإصلاحات والصيانة',
    };
  }
  if (context.includes('حادث') || context.includes('طوارئ') || context.includes('إسعاف')) {
    return {
      cleanName,
      roleTitle: 'مسؤول الحوادث والطوارئ',
    };
  }
  if (
    context.includes('تبرع') ||
    context.includes('إنسانية') ||
    context.includes('خيرية') ||
    context.includes('مساعدة')
  ) {
    return {
      cleanName,
      roleTitle: 'مسؤول التبرعات والحالات الإنسانية',
    };
  }
  if (context.includes('صحة') || context.includes('طبي') || context.includes('علاج')) {
    return {
      cleanName,
      roleTitle: 'مسؤول الصحة والخدمات الطبية',
    };
  }
  if (context.includes('زراعة') || context.includes('محصول')) {
    return {
      cleanName,
      roleTitle: 'مسؤول الزراعة والمرافق',
    };
  }

  return {
    cleanName,
    roleTitle: 'المشرف العام • إدارة القرية',
  };
}

export const SmallNewsCard = React.memo(function SmallNewsCard({
  item,
  onPress,
}: SmallNewsCardProps) {
  const { time, date } = formatPublishTimeAndDate(item.published_at);
  const directCoverUrl = getDirectImageUrl(item.cover_image_url);
  const directAvatarUrl = getDirectImageUrl(item.author_avatar_url);
  const directVideoUrl = getDirectVideoUrl(item.video_stream_url);
  const hasImage = Boolean(directCoverUrl);
  const hasVideo = Boolean(directVideoUrl);

  const { cleanName, roleTitle } = parseAuthorInfo(
    item.author_display_name,
    item.author_badge_label,
    item.title
  );

  return (
    <View style={styles.card}>
      {/* الرأس والنص قابلان للضغط لفتح التفاصيل */}
      <Pressable onPress={() => onPress?.(item)} style={styles.cardHeaderPressable}>
        {/* ١. رأس البوست الأنيق: صورة الناشر، اسمه الصافي، ودوره/قسمه تحته مباشرة */}
        <View style={styles.header}>
          <View style={styles.authorRow}>
            {item.author_avatar_url ? (
              <Image
                source={{ uri: directAvatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color="#973c00" />
              </View>
            )}

            <View style={styles.authorInfoCol}>
              {/* السطر الأول: اسم الناشر فقط بدون أي أقواس أو مكان بجانبه + علامة التوثيق */}
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {cleanName}
                </Text>
                {item.author_is_verified ? (
                  <Ionicons name="checkmark-circle" size={15} color="#0284C7" />
                ) : null}
              </View>

              {/* السطر الثاني: الدور أو القسم باللون الأسود، بدون أيقونة، وبدون بوكس/خلفية */}
              <View style={styles.authorRoleRow}>
                <Text style={styles.authorRoleText} numberOfLines={1}>
                  {roleTitle}
                </Text>
              </View>

              {/* السطر الثالث: وقت وتاريخ النشر */}
              <View style={styles.timeDateRow}>
                <Ionicons name="time-outline" size={11} color="#94A3B8" />
                <Text style={styles.timeText}>{time}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.dateText}>{date}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ٢. عنوان المنشور - محاذاة صارمة من اليمين إلى اليسار */}
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.title}</Text>
        </View>

        {/* ٣. نص / براجراف المنشور - محاذاة صارمة من اليمين إلى اليسار */}
        <View style={styles.textWrap}>
          <Text style={styles.summary} numberOfLines={hasImage || hasVideo ? 3 : 5}>
            {item.summary}
          </Text>
        </View>
      </Pressable>

      {/* ٤. وسائط المنشور: إذا كان هناك فيديو يتم تشغيله مباشرة في الشاشة الرئيسية داخل الكارت بدون فتح صفحة */}
      {hasVideo ? (
        <View style={styles.mediaContainer}>
          <InlineDriveVideoPlayer
            videoUrl={directVideoUrl!}
            coverImageUrl={directCoverUrl}
            height={205}
          />
        </View>
      ) : hasImage ? (
        <Pressable
          style={styles.mediaContainer}
          onPress={() => onPress?.(item)}>
          <Image
            source={{ uri: directCoverUrl }}
            style={styles.image}
            contentFit="cover"
          />
        </Pressable>
      ) : null}

      {/* ٥. شريط التفاعل وتذييل البوست الحديث */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.moreButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => onPress?.(item)}>
          <Text style={styles.moreButtonText}>عرض التفاصيل الكاملة</Text>
          <Ionicons
            name={I18nManager.isRTL ? 'arrow-back' : 'chevron-back'}
            size={14}
            color="#973c00"
          />
        </Pressable>

        <View style={styles.viewsWrap}>
          <Ionicons name="eye-outline" size={14} color="#64748B" />
          <Text style={styles.viewsText}>{item.views_count} مشاهدة</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    alignItems: 'stretch',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderPressable: {
    width: '100%',
    alignItems: 'stretch',
  },
  header: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  authorRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  authorInfoCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  authorNameRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '800',
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  timeDateRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  textWrap: {
    width: '100%',
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginBottom: 6,
    width: '100%',
    alignSelf: 'stretch',
    lineHeight: 25,
  },
  summary: {
    fontSize: 14,
    color: '#475569',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 22.5,
    marginBottom: 12,
    width: '100%',
    alignSelf: 'stretch',
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 195,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  videoOnlyCard: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  videoOnlyBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
  },
  videoOnlyLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  footer: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    width: '100%',
  },
  viewsWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewsText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  moreButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#973c00',
    writingDirection: 'rtl',
  },
});
