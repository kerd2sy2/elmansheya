import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { CraftsmanItem } from '../types/craftsmen.types';

interface CraftsmanCardProps {
  item: CraftsmanItem;
  onRatePress?: (item: CraftsmanItem) => void;
  onPress?: (item: CraftsmanItem) => void;
}

export function CraftsmanCard({
  item,
  onRatePress,
  onPress,
}: CraftsmanCardProps) {
  const handleCall = () => {
    Linking.openURL(`tel:${item.phone}`);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(item)}>
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{item.full_name}</Text>
          {item.nickname ? (
            <Text style={styles.nickname}>{item.nickname}</Text>
          ) : null}
        </View>
        {item.is_accredited ? (
          <View style={styles.accreditedBadge}>
            <Ionicons name="checkmark-done-outline" size={14} color="#15803D" />
            <Text style={styles.accreditedText}>معتمد</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="construct-outline" size={14} color="#334155" />
        <Text style={styles.specialty}>
          {item.specialty} • {item.area || 'المنشية'}
        </Text>
      </View>

      {item.services_description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.services_description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.leftActions}>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={15} color="#D97706" />
            <Text style={styles.rating}>
              {item.average_rating.toFixed(1)} ({item.ratings_count})
            </Text>
          </View>

          {onRatePress ? (
            <Pressable
              style={styles.rateButton}
              onPress={(e) => {
                e.stopPropagation();
                onRatePress(item);
              }}>
              <Ionicons name="star-outline" size={13} color="#973c00" />
              <Text style={styles.rateButtonText}>تقييم</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={styles.callButton}
          onPress={(e) => {
            e.stopPropagation();
            handleCall();
          }}>
          <Ionicons name="call-outline" size={14} color="#FFFFFF" />
          <Text style={styles.callButtonText}>اتصال ({item.phone})</Text>
        </Pressable>
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
  },
  cardPressed: {
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  nickname: {
    fontSize: 13,
    color: '#973c00',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
    marginTop: 2,
  },
  accreditedBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  accreditedText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  specialty: {
    fontSize: 13,
    color: '#334155',
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
  },
  leftActions: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
  },
  rateButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateButtonText: {
    color: '#973c00',
    fontSize: 11.5,
    fontWeight: '700',
  },
  ratingWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  rating: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  callButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
