import { Ionicons } from '@expo/vector-icons';
import React, { memo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import { authStepStyles } from '../styles/authStepStyles';

interface RegisterDetailsStepProps {
  fullPhone: string;
  fullName: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  area: string;
  submitting: boolean;
  nameInputRef: React.RefObject<any>;
  onChangeFullName: (val: string) => void;
  onChangeBirthDay: (val: string) => void;
  onChangeBirthMonth: (val: string) => void;
  onChangeBirthYear: (val: string) => void;
  onChangeArea: (val: string) => void;
  onClearError: () => void;
  onSubmit: () => void;
}

export const RegisterDetailsStep = memo(function RegisterDetailsStep({
  fullPhone,
  fullName,
  birthDay,
  birthMonth,
  birthYear,
  area,
  submitting,
  nameInputRef,
  onChangeFullName,
  onChangeBirthDay,
  onChangeBirthMonth,
  onChangeBirthYear,
  onChangeArea,
  onClearError,
  onSubmit,
}: RegisterDetailsStepProps) {
  const monthInputRef = useRef<any>(null);
  const yearInputRef = useRef<any>(null);

  const isRegisterDisabled = !fullName.trim() || !birthYear.trim() || submitting;

  return (
    <View style={authStepStyles.stepBody}>
      <Text style={authStepStyles.cardTitle}>إكمال بيانات الحساب</Text>
      <Text style={authStepStyles.cardSubtitle}>
        تم توثيق رقم هاتفك بنجاح، يرجى إدخال اسمك وتاريخ ميلادك للمتابعة
      </Text>

      <View style={styles.verifiedBadge}>
        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        <Text style={styles.verifiedBadgeText}>{fullPhone}</Text>
      </View>

      <View style={authStepStyles.fieldBlock}>
        <Text style={authStepStyles.fieldLabel}>الاسم بالكامل</Text>
        <TextInput
          ref={nameInputRef}
          style={authStepStyles.textInput}
          placeholder="الاسم الثنائي أو الثلاثي"
          placeholderTextColor="#94A3B8"
          value={fullName}
          onChangeText={(t) => {
            onChangeFullName(t);
            onClearError();
          }}
          selectionColor={APP_THEME.primary}
        />
      </View>

      <View style={authStepStyles.fieldBlock}>
        <Text style={authStepStyles.fieldLabel}>تاريخ الميلاد</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>السنة</Text>
            <TextInput
              ref={yearInputRef}
              style={styles.dateInput}
              placeholder="1995"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={4}
              value={birthYear}
              onChangeText={(t) => {
                onChangeBirthYear(t.replace(/[^0-9]/g, ''));
                onClearError();
              }}
              selectionColor={APP_THEME.primary}
            />
          </View>

          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>الشهر</Text>
            <TextInput
              ref={monthInputRef}
              style={styles.dateInput}
              placeholder="05"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={2}
              value={birthMonth}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9]/g, '');
                onChangeBirthMonth(clean);
                onClearError();
                if (clean.length === 2) yearInputRef.current?.focus();
              }}
              selectionColor={APP_THEME.primary}
            />
          </View>

          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>اليوم</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="12"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={2}
              value={birthDay}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9]/g, '');
                onChangeBirthDay(clean);
                onClearError();
                if (clean.length === 2) monthInputRef.current?.focus();
              }}
              selectionColor={APP_THEME.primary}
            />
          </View>
        </View>
      </View>

      <View style={authStepStyles.fieldBlock}>
        <Text style={authStepStyles.fieldLabel}>المنطقة أو الشارع (اختياري)</Text>
        <TextInput
          style={authStepStyles.textInput}
          placeholder="المنشية"
          placeholderTextColor="#94A3B8"
          value={area}
          onChangeText={onChangeArea}
          selectionColor={APP_THEME.primary}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          authStepStyles.primaryBtn,
          isRegisterDisabled && authStepStyles.primaryBtnDisabled,
          pressed && !isRegisterDisabled && authStepStyles.primaryBtnPressed,
        ]}
        onPress={onSubmit}
        disabled={isRegisterDisabled}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStepStyles.primaryBtnText}>إتمام التسجيل والدخول</Text>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  verifiedBadge: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
    marginTop: -8,
  },
  verifiedBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  dateRow: {
    direction: 'ltr',
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateInput: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
