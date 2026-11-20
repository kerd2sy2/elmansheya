import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { authStepStyles } from '../styles/authStepStyles';

interface BiometricLoginCardProps {
  fullName: string;
  phone: string;
  loading: boolean;
  errorText: string | null;
  onAuthenticate: () => void;
  onUseDifferentPhone: () => void;
}

export const BiometricLoginCard = memo(function BiometricLoginCard({
  fullName,
  phone,
  loading,
  errorText,
  onAuthenticate,
  onUseDifferentPhone,
}: BiometricLoginCardProps) {
  // تشغيل طلب البصمة تلقائياً عند فتح الشاشة
  useEffect(() => {
    const timer = setTimeout(() => {
      onAuthenticate();
    }, 450);
    return () => clearTimeout(timer);
  }, [onAuthenticate]);

  return (
    <View style={authStepStyles.stepBody}>
      <View style={styles.avatarCircle}>
        <Ionicons name="finger-print" size={44} color={APP_THEME.primary} />
      </View>

      <Text style={authStepStyles.cardTitle}>مرحباً بك مجدداً</Text>
      <Text style={styles.userNameText}>{fullName}</Text>
      <Text style={styles.userPhoneText}>{phone}</Text>

      {errorText ? (
        <View style={styles.bioErrorBox}>
          <Ionicons name="alert-circle" size={17} color="#DC2626" />
          <Text style={styles.bioErrorText}>{errorText}</Text>
        </View>
      ) : (
        <Text style={authStepStyles.cardSubtitle}>
          يمكنك الدخول السريع والفوري إلى حسابك باستخدام بصمة الإصبع أو بصمة الوجه.
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [
          authStepStyles.primaryBtn,
          loading && authStepStyles.primaryBtnDisabled,
          pressed && !loading && authStepStyles.primaryBtnPressed,
          styles.mainBioBtn,
        ]}
        onPress={onAuthenticate}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="تسجيل الدخول بالبصمة">
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.btnRow}>
            <Ionicons name="finger-print-outline" size={20} color="#FFFFFF" />
            <Text style={authStepStyles.primaryBtnText}>الدخول بالبصمة / Face ID</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.altPhoneBtn,
          pressed && styles.altPhoneBtnPressed,
        ]}
        onPress={onUseDifferentPhone}
        accessibilityRole="button"
        accessibilityLabel="تسجيل الدخول برقم هاتف آخر">
        <Ionicons name="phone-portrait-outline" size={16} color="#64748B" />
        <Text style={styles.altPhoneText}>تسجيل الدخول برقم آخر</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: APP_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  userPhoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    direction: 'ltr',
  },
  bioErrorBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  bioErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: rtlTextAlign,
  },
  mainBioBtn: {
    marginTop: 10,
    width: '100%',
  },
  btnRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  altPhoneBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  altPhoneBtnPressed: {
    opacity: 0.7,
  },
  altPhoneText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
});
