import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlTextAlign } from '@/core/theme/rtl';
import { ServiceCategoryItem, ServiceSubCategory } from '../types/services.types';

export const CATEGORY_PREVIEWS: Record<string, string> = {
  medical: 'صيدليات • معامل • مستشفيات',
  events: 'أفراح • سرادقات • مياتم',
  transport: 'عربيات • تكاتك • تاكسي',
  education: 'ابتدائي • إعدادي • ثانوي • أزهري',
  religious: 'مساجد • كنائس • تحفيظ',
  gov: 'مياه • شهر عقاري • بريد',
  humanitarian: 'مساعدات • علاج • كفالة',
  shops: 'مخابز • بقالة وتموين',
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
  const preview =
    CATEGORY_PREVIEWS[item.slug] || CATEGORY_PREVIEWS[item.id] || 'خدمات ومرافق المنشية';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}>
      {/* الصف العلوي: أيقونة القسم بثيم المنشية المعتمد وسهم توجيهي */}
      <View style={styles.topRow}>
        <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={isSelected ? '#FFFFFF' : '#973c00'}
          />
        </View>
        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-back" size={14} color="#973c00" />
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

      {/* شارة العرض السريع للأقسام الفرعية متناسقة 100% مع ثيم المنشية */}
      <View style={styles.previewPill}>
        <Text style={styles.previewText} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 168,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardSelected: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  cardPressed: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
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
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  iconBoxSelected: {
    backgroundColor: '#973c00',
    borderColor: '#973c00',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#973c00',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
