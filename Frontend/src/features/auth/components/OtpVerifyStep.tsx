import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { formatResendWait } from '../hooks/useWhatsAppAuthFlow';
import { authStepStyles } from '../styles/authStepStyles';

interface OtpVerifyStepProps {
  fullPhone: string;
  otpCode: string;
  submitting: boolean;
  isOtpLocked: boolean;
  resendTimer: number;
  otpInputRef: React.RefObject<any>;
  onChangeOtpCode: (code: string) => void;
  onClearError: () => void;
  onVerify: (codeOverride?: string) => void;
  onResendOtp: () => void;
}

export const OtpVerifyStep = memo(function OtpVerifyStep({
  fullPhone,
  otpCode,
  submitting,
  isOtpLocked,
  resendTimer,
  otpInputRef,
  onChangeOtpCode,
  onClearError,
  onVerify,
  onResendOtp,
}: OtpVerifyStepProps) {
  const isVerifyDisabled = otpCode.length < 4 || submitting || isOtpLocked;

  return (
    <View style={authStepStyles.stepBody}>
      <View style={styles.otpHeaderRow}>
        <Text style={styles.otpTitleInline} numberOfLines={1}>
          تأكيد رمز التحقق لرقم
        </Text>
        <Text style={styles.otpPhoneInline} numberOfLines={1}>
          {fullPhone}
        </Text>
      </View>
      <Text style={authStepStyles.cardSubtitle}>
        أدخل الرمز المكون من 4 أرقام المرسل عبر واتساب
      </Text>

      <Pressable
        style={styles.otpCellsWrapper}
        onPress={() => otpInputRef.current?.focus()}>
        <View style={styles.otpCellsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const digit = otpCode[idx] || '';
            const isFocusedCell =
              otpCode.length === idx || (idx === 3 && otpCode.length === 4);
            const isFilled = Boolean(digit);

            return (
              <View
                key={idx}
                style={[
                  styles.otpCell,
                  isFilled && styles.otpCellFilled,
                  isFocusedCell && styles.otpCellActive,
                ]}>
                <Text style={styles.otpCellText}>{digit}</Text>
              </View>
            );
          })}
        </View>

        <TextInput
          ref={otpInputRef}
          style={styles.hiddenOtpInput}
          value={otpCode}
          editable={!isOtpLocked && !submitting}
          onChangeText={(val) => {
            if (isOtpLocked) return;
            const clean = val.replace(/[^0-9]/g, '').slice(0, 4);
            onChangeOtpCode(clean);
            onClearError();
            if (clean.length === 4 && !isOtpLocked) {
              onVerify(clean);
            }
          }}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          caretHidden
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          authStepStyles.primaryBtn,
          isVerifyDisabled && authStepStyles.primaryBtnDisabled,
          pressed && !isOtpLocked && authStepStyles.primaryBtnPressed,
        ]}
        onPress={() => onVerify()}
        disabled={isVerifyDisabled}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStepStyles.primaryBtnText}>تأكيد المتابعة</Text>
        )}
      </Pressable>

      <View style={authStepStyles.resendWrap}>
        {resendTimer > 0 ? (
          <Text style={authStepStyles.resendTimerText}>
            يمكنك إعادة إرسال الرمز خلال {formatResendWait(resendTimer)}
          </Text>
        ) : (
          <Pressable onPress={onResendOtp} hitSlop={8}>
            <Text style={authStepStyles.resendActionText}>
              إعادة إرسال الرمز
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  otpHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
    width: '100%',
  },
  otpTitleInline: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpPhoneInline: {
    fontSize: 13.5,
    fontWeight: '700',
    color: APP_THEME.primary,
    writingDirection: 'ltr',
  },
  otpCellsWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 22,
  },
  otpCellsRow: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  otpCell: {
    width: 58,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: APP_THEME.primary,
  },
  otpCellActive: {
    backgroundColor: APP_THEME.primaryLight,
    borderColor: APP_THEME.primary,
    borderWidth: 2,
  },
  otpCellText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.015,
    fontSize: 24,
  },
});
