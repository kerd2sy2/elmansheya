import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { getDirectImageUrl, getDirectVideoUrl } from '@/core/utils/googleDrive';
import { InlineDriveVideoPlayer } from '@/features/admin/components/InlineDriveVideoPlayer';
import { NewsCardItem } from '../types/news.types';

interface SmallNewsCardProps {
  item: NewsCardItem;
  onPress?: (item: NewsCardItem) => void;
}

export function SmallNewsCard({ item }: SmallNewsCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const directCoverUrl = getDirectImageUrl(item.cover_image_url);
  const directVideoUrl = getDirectVideoUrl(item.video_stream_url);
  const hasVideo = Boolean(directVideoUrl);

  const isLongSummary = (item.summary?.length ?? 0) > 110;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  return (
    <View style={styles.card}>
      {/* 1. عنوان الخبر وفقرة مختصرة تتوسع في نفس الصفحة */}
      <Text style={styles.title}>{item.title}</Text>
      <Text
        style={styles.summary}
        numberOfLines={isLongSummary && !isExpanded ? 3 : undefined}>
        {item.summary}
      </Text>
      {isLongSummary ? (
        <Pressable
          style={styles.expandTextBtn}
          onPress={toggleExpand}
          hitSlop={8}>
          <Text style={styles.expandTextLabel}>
            {isExpanded ? 'عرض أقل' : 'عرض المزيد...'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#973c00"
          />
        </Pressable>
      ) : null}

      {/* 2. وسائط الخبر: فيديو مدمج يشتغل مباشرة في الصفحة الرئيسية أو صورة الخبر */}
      {hasVideo ? (
        <View style={styles.mediaContainer}>
          <InlineDriveVideoPlayer
            videoUrl={directVideoUrl!}
            coverImageUrl={directCoverUrl}
            height={190}
          />
        </View>
      ) : directCoverUrl ? (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: directCoverUrl }}
            style={styles.image}
            contentFit="cover"
          />
        </View>
      ) : null}

      {/* 3. تذييل الخبر */}
      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <Ionicons name="newspaper-outline" size={14} color="#64748B" />
          <Text style={styles.metaText}>
            {item.author_display_name} - {item.published_at}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
    width: '100%',
  },
  summary: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 6,
    width: '100%',
  },
  expandTextBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    marginBottom: 10,
  },
  expandTextLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#973c00',
  },
  mediaContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  footer: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
});
