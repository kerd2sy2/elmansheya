import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { BreakingNewsItem } from '../types/news.types';

interface BreakingNewsTickerProps {
  items: BreakingNewsItem[];
}

export function BreakingNewsTicker({ items }: BreakingNewsTickerProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
        <Text style={styles.badgeText}>عاجل</Text>
      </View>
      <Text style={styles.tickerText} numberOfLines={2}>
        {items[0].title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  badge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tickerText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
});
