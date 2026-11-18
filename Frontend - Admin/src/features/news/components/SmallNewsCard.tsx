import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { getDirectImageUrl, getDirectVideoUrl } from '@/core/utils/googleDrive';
import { InlineDriveVideoPlayer } from '@/features/admin/components/InlineDriveVideoPlayer';
import { NewsCardItem } from '../types/news.types';

interface SmallNewsCardProps {
  item: NewsCardItem;
  onPress?: (item: NewsCardItem) => void;
}

export function SmallNewsCard({ item, onPress }: SmallNewsCardProps) {
  const directCoverUrl = getDirectImageUrl(item.cover_image_url);
  const directVideoUrl = getDirectVideoUrl(item.video_stream_url);
  const hasVideo = Boolean(directVideoUrl);

  return (
    <View style={styles.card}>
      {/* 1. عنوان الخبر وفقرة مختصرة */}
      <Pressable onPress={() => onPress?.(item)}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary} numberOfLines={3}>
          {item.summary}
        </Text>
      </Pressable>

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
        <Pressable onPress={() => onPress?.(item)}>
          <Image
            source={{ uri: directCoverUrl }}
            style={styles.image}
            contentFit="cover"
          />
        </Pressable>
      ) : null}

      {/* 3. زر المزيد عند وجود نص طويل */}
      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <Ionicons name="newspaper-outline" size={14} color="#64748B" />
          <Text style={styles.metaText}>
            {item.author_display_name} - {item.published_at}
          </Text>
        </View>
        <Pressable style={styles.moreButton} onPress={() => onPress?.(item)}>
          <Text style={styles.moreButtonText}>المزيد</Text>
          <Ionicons name="chevron-back-outline" size={14} color="#973c00" />
        </Pressable>
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
    marginBottom: 10,
    width: '100%',
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
    marginBottom: 10,
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
  moreButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
});
