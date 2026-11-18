import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { BASE_HEADER_HEIGHT } from './NewsHomeHeader';

interface NewNewsUpdateBannerProps {
  visible: boolean;
  topInset: number;
  showSearch: boolean;
  onPress: () => void;
}

export function NewNewsUpdateBanner({
  visible,
  topInset,
  showSearch,
  onPress,
}: NewNewsUpdateBannerProps) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.newNewsBannerWrap,
        {
          top:
            topInset +
            (showSearch ? BASE_HEADER_HEIGHT + 66 : BASE_HEADER_HEIGHT) +
            8,
        },
      ]}>
      <Pressable
        style={({ pressed }) => [
          styles.newNewsBannerBtn,
          pressed && styles.newNewsBannerBtnPressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="تحديث الصفحة وعرض الأخبار الجديدة">
        <View style={styles.newNewsPulseDot} />
        <Ionicons name="sparkles" size={15} color="#FFFFFF" />
        <Text style={styles.newNewsBannerText}>
          يوجد أخبار وتحديثات جديدة • اضغط أو اسحب للتحديث
        </Text>
        <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  newNewsBannerWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 120,
    alignItems: 'center',
  },
  newNewsBannerBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    elevation: 8,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  newNewsBannerBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  newNewsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  newNewsBannerText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: rtlTextAlign,
  },
});
