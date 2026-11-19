import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlTextAlign } from '@/core/theme/rtl';
import { ServiceCategoryItem, ServiceSubCategory } from '../types/services.types';

export interface CategoryTheme {
  primary: string;
  bgTint: string;
  border: string;
  iconBg: string;
  previewText: string;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  medical: {
    primary: '#DC2626',
    bgTint: '#FEF2F2',
    border: '#FECACA',
    iconBg: '#FEE2E2',
    previewText: 'صيدليات • معامل • مستشفيات',
  },
  events: {
    primary: '#D97706',
    bgTint: '#FFFBEB',
    border: '#FDE68A',
    iconBg: '#FEF3C7',
    previewText: 'أفراح • سرادقات • مياتم',
  },
  transport: {
    primary: '#0284C7',
    bgTint: '#F0F9FF',
    border: '#BAE6FD',
    iconBg: '#E0F2FE',
    previewText: 'عربيات • تكاتك • تاكسي',
  },
  education: {
    primary: '#4F46E5',
    bgTint: '#EEF2FF',
    border: '#C7D2FE',
    iconBg: '#E0E7FF',
    previewText: 'ابتدائي • إعدادي • ثانوي • أزهري',
  },
  religious: {
    primary: '#059669',
    bgTint: '#ECFDF5',
    border: '#A7F3D0',
    iconBg: '#D1FAE5',
    previewText: 'مساجد • كنائس • تحفيظ',
  },
  gov: {
    primary: '#7C3AED',
    bgTint: '#F5F3FF',
    border: '#DDD6FE',
    iconBg: '#EDE9FE',
    previewText: 'مياه • شهر عقاري • بريد',
  },
  humanitarian: {
    primary: '#E11D48',
    bgTint: '#FFF1F2',
    border: '#FECDD3',
    iconBg: '#FFE4E6',
    previewText: 'مساعدات • علاج • كفالة',
  },
  shops: {
    primary: '#EA580C',
    bgTint: '#FFF7ED',
    border: '#FED7AA',
    iconBg: '#FFEDD5',
    previewText: 'مخابز • بقالة وتموين',
  },
};

export const DEFAULT_CATEGORY_THEME: CategoryTheme = {
  primary: '#973c00',
  bgTint: '#FFF7ED',
  border: '#FED7AA',
  iconBg: '#FFEDD5',
  previewText: 'خدمات المنشية',
};

interface ServiceCategoryGridCardProps {
  item: ServiceCategoryItem | ServiceSubCategory;
  isSelected?: boolean;
  onPress: () => void;
}

export function ServiceCategoryGridCard({
  item,
  isSelected,
  onPress,
}: ServiceCategoryGridCardProps) {
  const theme =
    CATEGORY_THEMES[item.slug] || CATEGORY_THEMES[item.id] || DEFAULT_CATEGORY_THEME;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.border },
        isSelected && { borderColor: theme.primary, backgroundColor: theme.bgTint },
        pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
      ]}
      onPress={onPress}>
      {/* الصف العلوي: أيقونة القسم الملونة بألوان الهوية وسهم توجيهي */}
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={theme.primary}
          />
        </View>
        <View style={[styles.arrowCircle, { backgroundColor: theme.bgTint }]}>
          <Ionicons name="chevron-back" size={14} color={theme.primary} />
        </View>
      </View>

      {/* عنوان القسم الرئيسي */}
      <Text style={styles.title} numberOfLines={1}>
        {item.name_ar}
      </Text>

      {/* وصف مختصر للقسم */}
      <Text style={styles.desc} numberOfLines={2}>
        {item.description}
      </Text>

      {/* حبة العرض السريع للأقسام الفرعية بالأسفل */}
      <View
        style={[
          styles.previewPill,
          { backgroundColor: theme.bgTint, borderColor: theme.border },
        ]}>
        <Text
          style={[styles.previewText, { color: theme.primary }]}
          numberOfLines={1}>
          {theme.previewText}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 172,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    marginBottom: 3,
    width: '100%',
  },
  desc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 17,
    width: '100%',
    flex: 1,
  },
  previewPill: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
