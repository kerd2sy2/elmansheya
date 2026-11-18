import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { PublicReportItem } from '../types/reports.types';

interface PublicReportCardProps {
  item: PublicReportItem;
}

/**
 * PublicReportCard يعرض البلاغ العام للقرية دون إظهار اسم أو بيانات صاحب البلاغ (البند 6.8 و 6.9)
 */
export function PublicReportCard({ item }: PublicReportCardProps) {
  const isResolved = item.status === 'resolved';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.typeTag}>
          بلاغ رقم {item.report_number} - {item.report_type_ar}
        </Text>
        <View
          style={[
            styles.statusBadge,
            isResolved ? styles.statusResolved : styles.statusInProgress,
          ]}>
          <Ionicons
            name={isResolved ? 'checkmark-circle-outline' : 'sync-outline'}
            size={13}
            color={isResolved ? '#15803D' : '#B45309'}
          />
          <Text
            style={[
              styles.statusText,
              isResolved
                ? styles.statusTextResolved
                : styles.statusTextInProgress,
            ]}>
            {item.status_ar}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.description}</Text>

      {item.image_url ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: item.image_url }} style={styles.reportImage} />
        </View>
      ) : null}

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color="#334155" />
        <Text style={styles.address}>{item.manual_address}</Text>
      </View>

      {item.resolution_summary ? (
        <View style={styles.resolutionBox}>
          <Text style={styles.resolutionTitle}>توثيق الحل من المشرف المختص:</Text>
          <Text style={styles.resolutionText}>{item.resolution_summary}</Text>
        </View>
      ) : null}

      <View style={styles.privacyRow}>
        <Ionicons name="lock-closed-outline" size={13} color="#64748B" />
        <Text style={styles.privacyNote}>
          اسم مقدم البلاغ مخفي عن المواطنين ويظهر للمشرف المختص فقط -{' '}
          {item.created_at_ar}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
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
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextResolved: {
    color: '#15803D',
  },
  statusTextInProgress: {
    color: '#B45309',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
    width: '100%',
  },
  desc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 8,
    width: '100%',
  },
  imageWrap: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  reportImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  addressRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  address: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
    flex: 1,
  },
  resolutionBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 10,
  },
  resolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
    width: '100%',
  },
  resolutionText: {
    fontSize: 12,
    color: '#15803D',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  privacyRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  privacyNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
});
