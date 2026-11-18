import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ServiceCategoryItem } from '../types/services.types';

interface ServiceCategoryGridCardProps {
  item: ServiceCategoryItem;
  isSelected?: boolean;
  onPress: () => void;
}

export function ServiceCategoryGridCard({
  item,
  isSelected,
  onPress,
}: ServiceCategoryGridCardProps) {
  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}>
      <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={22}
          color={isSelected ? '#FFFFFF' : '#973c00'}
        />
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
    alignItems: 'flex-end',
    marginBottom: 10,
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
    marginBottom: 8,
  },
  iconBoxSelected: {
    backgroundColor: '#973c00',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
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
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
    width: '100%',
  },
});
