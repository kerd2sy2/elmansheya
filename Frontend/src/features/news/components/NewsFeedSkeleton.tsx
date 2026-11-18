import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';

function SkeletonCard({
  pulseAnim,
  hasMedia = true,
}: {
  pulseAnim: Animated.Value;
  hasMedia?: boolean;
}) {
  return (
    <View style={styles.card}>
      {/* رأس الكارت: صورة الناشر والمعلومات + المشاهدات على الشمال */}
      <View style={styles.headerRow}>
        <View style={styles.authorGroup}>
          <Animated.View style={[styles.avatar, { opacity: pulseAnim }]} />
          <View style={styles.authorInfoCol}>
            <Animated.View style={[styles.bar, styles.authorNameBar, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.bar, styles.authorRoleBar, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.bar, styles.timeBar, { opacity: pulseAnim }]} />
          </View>
        </View>
        <Animated.View style={[styles.bar, styles.viewsBar, { opacity: pulseAnim }]} />
      </View>

      {/* عنوان البوست */}
      <View style={styles.contentWrap}>
        <Animated.View style={[styles.bar, styles.titleBar, { opacity: pulseAnim }]} />
      </View>

      {/* تفاصيل / نص البوست */}
      <View style={styles.contentWrap}>
        <Animated.View style={[styles.bar, styles.textBarLong, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.bar, styles.textBarMedium, { opacity: pulseAnim }]} />
      </View>

      {/* صندوق الوسائط (فيديو أو صورة) */}
      {hasMedia ? (
        <Animated.View style={[styles.mediaBox, { opacity: pulseAnim }]} />
      ) : null}
    </View>
  );
}

/**
 * شاشة الهيكل التحميلي (Skeleton Feed)
 * تظهر فور فتح التطبيق لحين اكتمال تحميل الأخبار والفيديوهات دون أي وميض أو شاشات فارغة
 */
export function NewsFeedSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <SkeletonCard pulseAnim={pulseAnim} hasMedia={true} />
      <SkeletonCard pulseAnim={pulseAnim} hasMedia={true} />
      <SkeletonCard pulseAnim={pulseAnim} hasMedia={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authorGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  authorInfoCol: {
    flex: 1,
    gap: 6,
  },
  bar: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  authorNameBar: {
    width: 120,
    height: 14,
  },
  authorRoleBar: {
    width: 90,
    height: 10,
  },
  timeBar: {
    width: 70,
    height: 9,
  },
  contentWrap: {
    marginBottom: 10,
    gap: 6,
  },
  titleBar: {
    width: '85%',
    height: 17,
    borderRadius: 6,
  },
  textBarLong: {
    width: '98%',
    height: 12,
  },
  textBarMedium: {
    width: '70%',
    height: 12,
  },
  mediaBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  viewsBar: {
    width: 45,
    height: 14,
    borderRadius: 6,
    marginTop: 4,
  },
});
