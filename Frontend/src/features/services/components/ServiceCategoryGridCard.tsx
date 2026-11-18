import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlTextAlign } from '@/core/theme/rtl';
import { ServiceCategoryItem, ServiceSubCategory } from '../types/services.types';

interface ServiceCategoryGridCardProps {
  item: ServiceCategoryItem | ServiceSubCategory;
  isSelected?: boolean;
  onPress: () => void;
  count?: number;
}

export function ServiceCategoryGridCard({
  item,
  isSelected,
  onPress,
  count,
}: ServiceCategoryGridCardProps) {
  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={isSelected ? '#FFFFFF' : '#973c00'}
          />
        </View>
        {typeof count === 'number' && count > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, isSelected && styles.titleSelected]}>
        {item.name_ar}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>
        {item.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  countBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#973c00',
  },
  cardSelected: {
    borderColor: '#973c00',
    backgroundColor: '#FFF7ED',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: '#973c00',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginBottom: 4,
    width: '100%',
  },
  titleSelected: {
    color: '#973c00',
  },
  desc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 18,
    width: '100%',
  },
});
