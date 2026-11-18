import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { COUNTRY_OPTIONS, formatResendWait } from '../hooks/useWhatsAppAuthFlow';
import { authStepStyles } from '../styles/authStepStyles';

interface PhoneEntryStepProps {
  dialCode: string;
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
  onChangeDialCode: (text: string) => void;
  onChangePhone: (text: string) => void;
  onSubmit: () => void;
  onOpenCountryPicker: () => void;
  onCloseCountryPicker: () => void;
  onSelectCountryDial: (dialCode: string) => void;
  onReturnToOtp: () => void;
}

export const PhoneEntryStep = memo(function PhoneEntryStep({
  dialCode,
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
  onChangeDialCode,
  onChangePhone,
  onSubmit,
  onOpenCountryPicker,
  onCloseCountryPicker,
  onSelectCountryDial,
  onReturnToOtp,
}: PhoneEntryStepProps) {
  return (
    <View style={authStepStyles.stepBody}>
      <Text style={authStepStyles.cardTitle}>تسجيل الدخول</Text>
      <Text style={authStepStyles.cardSubtitle}>
        أدخل رقم هاتفك لاستلام رمز التحقق عبر واتساب والدخول مباشرة
      </Text>

      <View style={authStepStyles.fieldBlock}>
        <View style={styles.ltrPhoneBar}>
          <View style={styles.dialKeyGroup}>
            <Pressable
              onPress={onOpenCountryPicker}
              style={styles.dropdownTrigger}
              hitSlop={8}>
              <Ionicons name="chevron-down" size={15} color="#64748B" />
            </Pressable>
            <TextInput
              style={styles.dialCodeInput}
              value={dialCode}
              onChangeText={onChangeDialCode}
              keyboardType="phone-pad"
              maxLength={5}
              selectionColor={APP_THEME.primary}
            />
          </View>

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

      <Modal
        visible={showCountryPicker}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={onCloseCountryPicker}>
        <Pressable style={styles.modalBackdrop} onPress={onCloseCountryPicker}>
          <Pressable
            style={styles.countrySheet}
            onPress={(e) => e.stopPropagation()}>
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

            <ScrollView
              style={styles.countryScroll}
              showsVerticalScrollIndicator={false}>
              {COUNTRY_OPTIONS.map((item) => {
                const isSelected = dialCode === item.dialCode;
                return (
                  <Pressable
                    key={item.code}
                    style={[
                      styles.countryOptionRow,
                      isSelected && styles.countryOptionRowActive,
                    ]}
                    onPress={() => onSelectCountryDial(item.dialCode)}>
                    <Text
                      style={[
                        styles.countryOptionName,
                        isSelected && styles.countryOptionNameActive,
                      ]}>
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
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
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
  dialKeyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dropdownTrigger: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialCodeInput: {
    height: 52,
    fontSize: 17,
    fontWeight: '700',
    color: APP_THEME.primary,
    textAlign: 'center',
    writingDirection: 'ltr',
    paddingVertical: 0,
    paddingHorizontal: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginLeft: 4,
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
  countrySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    maxHeight: '65%',
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
    marginBottom: 14,
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
  countryScroll: {
    width: '100%',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
});
