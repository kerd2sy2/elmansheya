import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { NewsCardItem } from '../types/news.types';

interface FeaturedNewsCardProps {
  item: NewsCardItem;
  onPress?: (item: NewsCardItem) => void;
}

export function FeaturedNewsCard({ item, onPress }: FeaturedNewsCardProps) {
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
      {item.cover_image_url ? (
        <Image
          source={{ uri: item.cover_image_url }}
          style={styles.coverImage}
          contentFit="cover"
        />
      ) : null}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.pinnedBadge}>
            <Ionicons name="bookmark-outline" size={14} color="#0369A1" />
            <Text style={styles.pinnedBadgeText}>خبر رئيسي مثبت</Text>
          </View>

          <View style={styles.viewsWrap}>
            <Ionicons name="eye-outline" size={15} color="#64748B" />
            <Text style={styles.viewsText}>{item.views_count} مشاهدة</Text>
          </View>
        </View>

        <Pressable onPress={() => onPress?.(item)}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.summary}>{item.summary}</Text>
        </Pressable>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-circle-outline" size={16} color="#334155" />
            <Text style={styles.author}>الناشر: {item.author_display_name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color="#64748B" />
            <Text style={styles.time}>{item.published_at}</Text>
          </View>
        </View>

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
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0',
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
    fontSize: 12,
    color: '#64748B',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
    lineHeight: 26,
    width: '100%',
  },
  summary: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
    marginBottom: 12,
    width: '100%',
  },
  metaRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  time: {
    fontSize: 12,
    color: '#64748B',
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
