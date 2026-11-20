import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useCallback, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { BiometricLoginCard } from '../components/BiometricLoginCard';
import { OtpVerifyStep } from '../components/OtpVerifyStep';
import { PhoneEntryStep } from '../components/PhoneEntryStep';
import { RegisterDetailsStep } from '../components/RegisterDetailsStep';
import { WelcomeOnboarding } from '../components/WelcomeOnboarding';
import { useAuth } from '../context/AuthContext';
import { useWhatsAppAuthFlow } from '../hooks/useWhatsAppAuthFlow';

export function LoginScreen() {
  const { savedBiometricSession, loginWithBiometric } = useAuth();
  const flow = useWhatsAppAuthFlow();
  const [useDifferentPhone, setUseDifferentPhone] = useState<boolean>(false);
  const [bioLoading, setBioLoading] = useState<boolean>(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const keyboardOffset = useSmoothKeyboardOffset(
    Platform.OS === 'android' ? 10 : 0
  );

  const handleBiometricAuth = useCallback(async () => {
    setBioError(null);
    setBioLoading(true);
    try {
      const res = await loginWithBiometric();
      if (!res.ok && res.error) {
        setBioError(res.error);
      }
    } catch {
      setBioError('تعذر التحقق من البصمة. يرجى المحاولة مرة أخرى.');
    } finally {
      setBioLoading(false);
    }
  }, [loginWithBiometric]);

  const handleOpenCountryPicker = useCallback(
    () => flow.setShowCountryPicker(true),
    [flow.setShowCountryPicker]
  );
  const handleCloseCountryPicker = useCallback(
    () => flow.setShowCountryPicker(false),
    [flow.setShowCountryPicker]
  );
  const handleClearError = useCallback(
    () => flow.setErrorText(null),
    [flow.setErrorText]
  );

  if (flow.hasSeenOnboarding === false) {
    return <WelcomeOnboarding onStartAuth={flow.handleCompleteOnboarding} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[styles.keyboardView, { paddingBottom: keyboardOffset }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandHeader}>
            <View style={styles.brandRow}>
              <LottieView
                source={require('../../../../assets/json/logo.json')}
                autoPlay
                loop={false}
                style={styles.logoLottie}
              />
              <Text style={styles.brandTitle}>المنشية</Text>
            </View>
            <Text style={styles.brandSubtitle}>
              البوابة الرقمية الموحدة لأهالي قرية المنشية
            </Text>
          </View>

          <View style={styles.card}>
            {flow.step !== 'phone' ? (
              <Pressable
                style={styles.backRow}
                onPress={flow.handleBackStep}
                hitSlop={10}>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={APP_THEME.primary}
                />
                <Text style={styles.backText}>تغيير الرقم</Text>
              </Pressable>
            ) : null}

            {flow.errorText ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{flow.errorText}</Text>
              </View>
            ) : null}

            {flow.step === 'phone' && savedBiometricSession && !useDifferentPhone ? (
              <BiometricLoginCard
                fullName={savedBiometricSession.full_name || 'مواطن'}
                phone={savedBiometricSession.phone}
                loading={bioLoading}
                errorText={bioError}
                onAuthenticate={handleBiometricAuth}
                onUseDifferentPhone={() => setUseDifferentPhone(true)}
              />
            ) : flow.step === 'phone' ? (
              <PhoneEntryStep
                selectedCountry={flow.selectedCountry}
                phone={flow.phone}
                requiredPhoneLength={flow.requiredPhoneLength}
                submitting={flow.submitting}
                isPhoneSendDisabled={flow.isPhoneSendDisabled}
                isSendBatchBlocked={flow.isSendBatchBlocked}
                isSamePhoneInCooldown={flow.isSamePhoneInCooldown}
                isOtpLocked={flow.isOtpLocked}
                resendTimer={flow.resendTimer}
                showCountryPicker={flow.showCountryPicker}
                phoneInputRef={flow.phoneInputRef}
                onChangePhone={flow.handlePhoneChange}
                onSubmit={flow.handleSendWhatsAppOtp}
                onOpenCountryPicker={handleOpenCountryPicker}
                onCloseCountryPicker={handleCloseCountryPicker}
                onSelectCountry={flow.handleSelectCountry}
                onReturnToOtp={flow.handleReturnToOtp}
                onSwitchToBiometric={
                  savedBiometricSession ? () => setUseDifferentPhone(false) : undefined
                }
                savedBiometricName={savedBiometricSession?.full_name}
              />
            ) : null}

            {flow.step === 'otp' ? (
              <OtpVerifyStep
                fullPhone={flow.fullInternationalPhone}
                otpCode={flow.otpCode}
                submitting={flow.submitting}
                isOtpLocked={flow.isOtpLocked}
                resendTimer={flow.resendTimer}
                otpInputRef={flow.otpInputRef}
                onChangeOtpCode={flow.setOtpCode}
                onClearError={handleClearError}
                onVerify={flow.handleVerifyOtp}
                onResendOtp={flow.handleSendWhatsAppOtp}
              />
            ) : null}

            {flow.step === 'register_details' ? (
              <RegisterDetailsStep
                fullPhone={flow.fullInternationalPhone}
                fullName={flow.newFullName}
                birthDay={flow.newBirthDay}
                birthMonth={flow.newBirthMonth}
                birthYear={flow.newBirthYear}
                area={flow.newArea}
                submitting={flow.submitting}
                nameInputRef={flow.nameInputRef}
                onChangeFullName={flow.setNewFullName}
                onChangeBirthDay={flow.setNewBirthDay}
                onChangeBirthMonth={flow.setNewBirthMonth}
                onChangeBirthYear={flow.setNewBirthYear}
                onChangeArea={flow.setNewArea}
                onClearError={handleClearError}
                onSubmit={flow.handleCompleteRegistration}
              />
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  logoLottie: {
    width: 48,
    height: 48,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  backRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: APP_THEME.primary,
  },
  errorBox: {
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
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: rtlTextAlign,
  },
});
