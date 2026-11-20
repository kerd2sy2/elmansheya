import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { getDirectImageUrl } from '@/core/utils/googleDrive';
import { PublicReportItem } from '../types/reports.types';

interface PublicReportCardProps {
  item: PublicReportItem;
  onPress?: (item: PublicReportItem) => void;
}

function getCategoryMeta(typeAr?: string): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
} {
  const safeType = (typeAr || '').trim();
  if (safeType.includes('كهرباء') || safeType.includes('إنارة')) {
    return { icon: 'bulb-outline', color: '#D97706', bgColor: '#FEF3C7' };
  }
  if (safeType.includes('صرف')) {
    return { icon: 'water-outline', color: '#0284C7', bgColor: '#E0F2FE' };
  }
  if (safeType.includes('مياه')) {
    return { icon: 'rainy-outline', color: '#2563EB', bgColor: '#DBEAFE' };
  }
  if (safeType.includes('نظافة') || safeType.includes('قمامة')) {
    return { icon: 'trash-outline', color: '#16A34A', bgColor: '#DCFCE7' };
  }
  if (safeType.includes('طرق') || safeType.includes('تمهيد') || safeType.includes('شارع')) {
    return { icon: 'navigate-outline', color: '#7C3AED', bgColor: '#EDE9FE' };
  }
  if (safeType.includes('مدارس') || safeType.includes('مرافق') || safeType.includes('صحة')) {
    return { icon: 'school-outline', color: '#EA580C', bgColor: '#FFEDD5' };
  }
  return { icon: 'document-text-outline', color: '#973c00', bgColor: '#FFF7ED' };
}

/**
 * PublicReportCard يعرض البلاغ العام للقرية بتصميم عصري وأنيق مع عرض الصور والمرفقات
 */
export function PublicReportCard({ item, onPress }: PublicReportCardProps) {
  const [imageError, setImageError] = useState(false);
  const isResolved = item.status === 'resolved';
  const isInProgress = item.status === 'in_progress';
  const category = getCategoryMeta(item.report_type_ar);

  const resolvedUrl = getDirectImageUrl(item.image_url);
  const displayImageUrl = resolvedUrl && !imageError ? resolvedUrl : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress?.(item)}>
      {/* السطر العلوي: الفئة ورقم البلاغ + شارة حالة البلاغ الملونة */}
      <View style={styles.headerRow}>
        <View style={styles.categoryPillRow}>
          <View style={[styles.categoryIconCircle, { backgroundColor: category.bgColor }]}>
            <Ionicons name={category.icon} size={15} color={category.color} />
          </View>
          <Text style={styles.categoryTitleText}>{item.report_type_ar || 'بلاغ عام'}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isResolved
              ? styles.statusResolved
              : isInProgress
                ? styles.statusInProgress
                : styles.statusUnderReview,
          ]}>
          <Ionicons
            name={
              isResolved
                ? 'checkmark-circle'
                : isInProgress
                  ? 'construct-outline'
                  : 'time-outline'
            }
            size={13}
            color={
              isResolved ? '#15803D' : isInProgress ? '#0284C7' : '#B45309'
            }
          />
          <Text
            style={[
              styles.statusText,
              isResolved
                ? styles.statusTextResolved
                : isInProgress
                  ? styles.statusTextInProgress
                  : styles.statusTextUnderReview,
            ]}>
            {item.status_ar || (isResolved ? 'تم الحل' : isInProgress ? 'قيد التنفيذ' : 'تحت المراجعة')}
          </Text>
        </View>
      </View>

      {/* عنوان وتفاصيل البلاغ */}
      <Text style={styles.title}>{item.title || 'بلاغ ميداني'}</Text>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

      {/* صورة البلاغ العصرية والواضحة */}
      {displayImageUrl ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: displayImageUrl }}
            style={styles.reportImage}
            contentFit="cover"
            transition={300}
            onError={() => setImageError(true)}
          />
          <View style={styles.imageOverlayBadge}>
            <Ionicons name="camera-outline" size={13} color="#FFFFFF" />
            <Text style={styles.imageOverlayText}>مرفق ميداني موثق</Text>
          </View>
        </View>
      ) : null}

      {/* المكان بالتفصيل داخل القرية */}
      <View style={styles.addressRow}>
        <View style={styles.addressIconWrap}>
          <Ionicons name="location-sharp" size={14} color="#973c00" />
        </View>
        <Text style={styles.addressText} numberOfLines={2}>
          {item.manual_address || 'قرية المنشية'}
        </Text>
      </View>

      {/* كارت توثيق الحل من المشرف المختص إن وجد */}
      {item.resolution_summary ? (
        <View style={styles.resolutionBox}>
          <View style={styles.resolutionHeaderRow}>
            <Ionicons name="checkmark-done-circle" size={17} color="#16A34A" />
            <Text style={styles.resolutionTitle}>توثيق الحل الميداني من المشرف المختص:</Text>
          </View>
          <Text style={styles.resolutionText}>{item.resolution_summary}</Text>
        </View>
      ) : null}

      {/* السطر السفلي: الخصوصية وتاريخ التسجيل */}
      <View style={styles.cardFooterRow}>
        <View style={styles.privacyRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#64748B" />
          <Text style={styles.privacyNote} numberOfLines={1} ellipsizeMode="tail">
            تم توثيق البلاغ رسمياً • اسم المبلغ محجوب للخصوصية
          </Text>
        </View>
        <Text style={styles.dateText}>{item.created_at_ar || 'مؤخراً'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  cardPressed: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.97,
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPillRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 7,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusResolved: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusInProgress: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  statusUnderReview: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusTextResolved: {
    color: '#15803D',
  },
  statusTextInProgress: {
    color: '#0284C7',
  },
  statusTextUnderReview: {
    color: '#B45309',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 23,
  },
  desc: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 21,
  },
  imageWrap: {
    width: '100%',
    height: 195,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageOverlayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 12.5,
    color: '#334155',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    fontWeight: '600',
    flex: 1,
  },
  resolutionBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  resolutionHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  resolutionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#166534',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  resolutionText: {
    fontSize: 12.5,
    color: '#15803D',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 19,
  },
  cardFooterRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  privacyRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  privacyNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
