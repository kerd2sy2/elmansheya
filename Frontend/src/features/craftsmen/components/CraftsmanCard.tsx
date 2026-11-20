import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlAlignItems, rtlFlexDirection } from '@/core/theme/rtl';
import { CraftsmanItem } from '../types/craftsmen.types';

interface CraftsmanCardProps {
  item: CraftsmanItem;
  onRatePress?: (item: CraftsmanItem) => void;
  onPress?: (item: CraftsmanItem) => void;
}

export function CraftsmanCard({
  item,
  onPress,
}: CraftsmanCardProps) {
  const handleCall = () => {
    Linking.openURL(`tel:${item.phone}`);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(item)}>
      {/* السطر العلوي: اسم الصنايعي مع الشهرة وشارة الاعتماد */}
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <View style={styles.nameWithNickRow}>
            <Text style={styles.name}>{item.full_name}</Text>
            {item.nickname ? (
              <Text style={styles.nickname}>({item.nickname})</Text>
            ) : null}
          </View>
        </View>

        {item.is_accredited ? (
          <View style={styles.accreditedBadge}>
            <Ionicons name="checkmark-done-outline" size={13} color="#15803D" />
            <Text style={styles.accreditedText}>معتمد</Text>
          </View>
        ) : null}
      </View>

      {/* سطر التخصص والمنطقة بمحاذاة كاملة لليمين */}
      <View style={styles.infoRow}>
        <Ionicons name="construct-outline" size={14} color="#64748B" />
        <Text style={styles.specialty}>
          {item.specialty} • {item.area || 'قرية المنشية'}
        </Text>
      </View>

      {/* نبذة عن الخدمات بمحاذاة اليمين */}
      {item.services_description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.services_description}
        </Text>
      ) : null}

      {/* الفوتر: زر الاتصال على اليمين وشارة التقييم الواضحة على اليسار */}
      <View style={styles.footerRow}>
        {/* زر الاتصال على اليمين */}
        <Pressable
          style={styles.callButton}
          onPress={(e) => {
            e.stopPropagation();
            handleCall();
          }}>
          <Ionicons name="call" size={14} color="#FFFFFF" />
          <Text style={styles.callButtonText}>اتصال ({item.phone})</Text>
        </Pressable>

        {/* التقييم بارز وواضح على اليسار بدون زرار تقييم خارجي */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color="#D97706" />
          <Text style={styles.ratingValue}>
            {item.average_rating > 0 ? item.average_rating.toFixed(1) : 'جديد'}
          </Text>
          {item.ratings_count > 0 ? (
            <Text style={styles.ratingCount}>({item.ratings_count})</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'stretch',
  },
  cardPressed: {
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameBlock: {
    flex: 1,
    alignItems: rtlAlignItems,
  },
  nameWithNickRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nickname: {
    fontSize: 13,
    color: '#973c00',
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  accreditedBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  accreditedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  specialty: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 12,
    width: '100%',
  },
  footerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 2,
  },
  callButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  ratingBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#B45309',
  },
  ratingCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#D97706',
  },
});
