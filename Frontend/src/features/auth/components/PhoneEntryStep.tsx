import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import {
  DEFAULT_COUNTRY,
  filterCountries,
  type CountryDialOption,
} from '../data/countries';
import { formatResendWait } from '../hooks/useWhatsAppAuthFlow';
import { authStepStyles } from '../styles/authStepStyles';

interface PhoneEntryStepProps {
  selectedCountry: CountryDialOption;
  phone: string;
  requiredPhoneLength: number;
  submitting: boolean;
  isPhoneSendDisabled: boolean;
  isSendBatchBlocked: boolean;
  isSamePhoneInCooldown: boolean;
  isOtpLocked: boolean;
  resendTimer: number;
  showCountryPicker: boolean;
  phoneInputRef: React.RefObject<any>;
  onChangePhone: (text: string) => void;
  onSubmit: () => void;
  onOpenCountryPicker: () => void;
  onCloseCountryPicker: () => void;
  onSelectCountry: (countryCode: string) => void;
  onReturnToOtp: () => void;
  onSwitchToBiometric?: () => void;
  savedBiometricName?: string;
}

export const PhoneEntryStep = memo(function PhoneEntryStep({
  selectedCountry = DEFAULT_COUNTRY,
  phone,
  requiredPhoneLength,
  submitting,
  isPhoneSendDisabled,
  isSendBatchBlocked,
  isSamePhoneInCooldown,
  isOtpLocked,
  resendTimer,
  showCountryPicker,
  phoneInputRef,
  onChangePhone,
  onSubmit,
  onOpenCountryPicker,
  onCloseCountryPicker,
  onSelectCountry,
  onReturnToOtp,
  onSwitchToBiometric,
  savedBiometricName,
}: PhoneEntryStepProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setSearchQuery('');
  }, [showCountryPicker]);

  const filteredCountries = useMemo(
    () => filterCountries(searchQuery),
    [searchQuery]
  );

  const activeCountry = selectedCountry ?? DEFAULT_COUNTRY;

  const renderCountryItem = useCallback(
    ({ item }: { item: CountryDialOption }) => {
      const isSelected = item.code === activeCountry.code;
      return (
        <Pressable
          style={[
            styles.countryOptionRow,
            isSelected && styles.countryOptionRowActive,
          ]}
          onPress={() => onSelectCountry(item.code)}>
          <Text
            style={[
              styles.countryOptionName,
              isSelected && styles.countryOptionNameActive,
            ]}
            numberOfLines={1}>
            {item.nameAr}
          </Text>

          <View style={styles.countryOptionRight}>
            <Text
              style={[
                styles.countryOptionDial,
                isSelected && styles.countryOptionDialActive,
              ]}>
              {item.dialCode}
            </Text>
            {isSelected ? (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={APP_THEME.primary}
              />
            ) : (
              <View style={styles.checkSpacer} />
            )}
          </View>
        </Pressable>
      );
    },
    [onSelectCountry, activeCountry.code]
  );

  return (
    <View style={authStepStyles.stepBody}>
      <Text style={authStepStyles.cardTitle}>تسجيل الدخول</Text>
      <Text style={authStepStyles.cardSubtitle}>
        أدخل رقم هاتفك لاستلام رمز التحقق عبر واتساب والدخول مباشرة
      </Text>

      <View style={authStepStyles.fieldBlock}>
        <View style={styles.ltrPhoneBar}>
          <Pressable
            onPress={onOpenCountryPicker}
            style={styles.dialKeySelector}
            hitSlop={6}>
            <Ionicons name="chevron-down" size={15} color="#64748B" />
            <Text style={styles.dialCodeText}>{activeCountry.dialCode}</Text>
          </Pressable>

          <View style={styles.verticalDivider} />

          <TextInput
            ref={phoneInputRef}
            style={styles.ltrPhoneInput}
            value={phone}
            onChangeText={onChangePhone}
            placeholder="رقم الهاتف"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={requiredPhoneLength}
            selectionColor={APP_THEME.primary}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!isPhoneSendDisabled) onSubmit();
            }}
          />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          authStepStyles.primaryBtn,
          isPhoneSendDisabled && authStepStyles.primaryBtnDisabled,
          pressed && !isPhoneSendDisabled && authStepStyles.primaryBtnPressed,
        ]}
        onPress={onSubmit}
        disabled={isPhoneSendDisabled}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="logo-whatsapp" size={19} color="#FFFFFF" />
            <Text style={authStepStyles.primaryBtnText}>إرسال رمز التحقق</Text>
          </>
        )}
      </Pressable>

      {isSendBatchBlocked || isSamePhoneInCooldown ? (
        <View style={authStepStyles.resendWrap}>
          <Text style={authStepStyles.resendTimerText}>
            {isSendBatchBlocked
              ? `تم استنفاد 3 محاولات، يمكنك المحاولة مجدداً خلال ${formatResendWait(resendTimer)}`
              : `يمكنك إرسال رمز جديد لهذا الرقم خلال ${formatResendWait(resendTimer)}`}
          </Text>
          {!isOtpLocked && isSamePhoneInCooldown ? (
            <Pressable
              onPress={onReturnToOtp}
              hitSlop={8}
              style={styles.returnOtpLink}>
              <Text style={authStepStyles.resendActionText}>
                العودة لإدخال الرمز الحالي
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark-outline" size={15} color="#64748B" />
        <Text style={styles.securityNoteText}>
          خدمة مجانية بالكامل ومؤمنة لأهالي القرية
        </Text>
      </View>

      {onSwitchToBiometric ? (
        <Pressable
          style={({ pressed }) => [
            styles.biometricSwitchBtn,
            pressed && styles.biometricSwitchBtnPressed,
          ]}
          onPress={onSwitchToBiometric}
          accessibilityRole="button"
          accessibilityLabel="تسجيل الدخول بالبصمة">
          <Ionicons name="finger-print" size={19} color={APP_THEME.primary} />
          <Text style={styles.biometricSwitchText}>
            الدخول السريع بالبصمة {savedBiometricName ? `(${savedBiometricName})` : ''}
          </Text>
        </Pressable>
      ) : null}

      <Modal
        visible={showCountryPicker}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={onCloseCountryPicker}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdropDismiss} onPress={onCloseCountryPicker} />

          <View style={styles.countrySheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>اختر مفتاح الدولة</Text>
              <Pressable
                onPress={onCloseCountryPicker}
                style={styles.sheetCloseBtn}
                hitSlop={10}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="ابحث عن الدولة أو المفتاح..."
                placeholderTextColor="#94A3B8"
                selectionColor={APP_THEME.primary}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={renderCountryItem}
              style={styles.countryList}
              contentContainerStyle={
                filteredCountries.length === 0 ? styles.emptyListContainer : undefined
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={16}
              maxToRenderPerBatch={20}
              windowSize={7}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    لا توجد دولة مطابقة للبحث
                  </Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  ltrPhoneBar: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  dialKeySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 4,
  },
  dialCodeText: {
    fontSize: 17,
    fontWeight: '700',
    color: APP_THEME.primary,
    writingDirection: 'ltr',
    includeFontPadding: false,
  },
  verticalDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginLeft: 6,
    marginRight: 8,
  },
  ltrPhoneInput: {
    flex: 1,
    height: 52,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
    textAlign: 'left',
    writingDirection: 'ltr',
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  returnOtpLink: {
    marginTop: 6,
  },
  securityNote: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  securityNoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  countrySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 20 : 32,
    height: '72%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  countryList: {
    flex: 1,
    width: '100%',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  countryOptionRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  countryOptionRowActive: {
    backgroundColor: APP_THEME.primaryLight,
    borderColor: APP_THEME.primaryBorder,
  },
  countryOptionName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    marginHorizontal: 8,
  },
  countryOptionNameActive: {
    color: APP_THEME.primary,
  },
  countryOptionRight: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryOptionDial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  countryOptionDialActive: {
    color: APP_THEME.primary,
  },
  checkSpacer: {
    width: 18,
  },
  biometricSwitchBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  biometricSwitchBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  biometricSwitchText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: APP_THEME.primary,
  },
});
