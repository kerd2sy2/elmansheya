import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { VerificationStateCode } from '../types/profile.types';

interface VerificationStatusCardProps {
  status: VerificationStateCode;
  onSubmitVerificationRequest?: () => void;
}

const STATUS_MAP: Record<
  VerificationStateCode,
  { label: string; color: string; bg: string }
> = {
  unverified: { label: 'غير موثق', color: '#92400E', bg: '#FEF3C7' },
  pending_review: { label: 'قيد المراجعة', color: '#0369A1', bg: '#E0F2FE' },
  verified: { label: 'موثق رسمياً', color: '#15803D', bg: '#DCFCE7' },
  rejected: { label: 'مرفوض', color: '#B91C1C', bg: '#FEE2E2' },
  reupload_required: {
    label: 'مطلوب إعادة الرفع',
    color: '#B45309',
    bg: '#FFEDD5',
  },
};

export function VerificationStatusCard({
  status,
  onSubmitVerificationRequest,
}: VerificationStatusCardProps) {
  const info = STATUS_MAP[status] ?? STATUS_MAP.unverified;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="id-card-outline" size={20} color="#0C4A6E" />
          <Text style={styles.title}>نظام توثيق حساب المواطن</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: info.bg }]}>
          <Text style={[styles.statusChipText, { color: info.color }]}>
            {info.label}
          </Text>
        </View>
      </View>

      <Text style={styles.desc}>
        يمكنك توثيق حسابك برفع صورة البطاقة الشخصية (الرقم القومي) في مساحة خاصة
        مشفرة لمراجعتها من فريق الدعم دون ظهورها في أي شاشة عامة.
      </Text>

      {status !== 'verified' ? (
        <Pressable
          style={styles.actionButton}
          onPress={onSubmitVerificationRequest}>
          <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>
            {status === 'pending_review'
              ? 'الطلب قيد مراجعة موظف الدعم'
              : 'رفع صورة البطاقة وإرسال طلب التوثيق'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4A6E',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  desc: {
    fontSize: 13,
    color: '#0369A1',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 12,
    width: '100%',
  },
  actionButton: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
