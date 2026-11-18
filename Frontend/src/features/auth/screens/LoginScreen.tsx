import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { AuthModal } from '../components/AuthModal';
import { WelcomeOnboarding } from '../components/WelcomeOnboarding';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { login, register, loginWithBiometric, savedBiometricSession } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState<boolean>(true);

  const handleLogin = async (
    phone: string,
    password: string,
    enableBiometric: boolean
  ) => {
    return login({
      phone,
      password,
      enable_biometric: enableBiometric,
    });
  };

  const handleRegister = async (
    fullName: string,
    phone: string,
    password: string,
    area: string,
    email?: string
  ) => {
    return register({
      full_name: fullName,
      phone,
      password,
      area,
      email,
    });
  };

  return (
    <View style={styles.screenContainer}>
      {/* ١. شاشات الترحيب الثلاث التفاعلية */}
      <WelcomeOnboarding onStartAuth={() => setShowAuthModal(true)} />

      {/* ٢. موديولا اختيار وتأكيد رقم الشريحة والدخول للرئيسية */}
      <WidgetErrorBoundary widgetNameAr="نافذة تسجيل الدخول وتأكيد الشريحة">
        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLoginSubmit={handleLogin}
          onRegisterSubmit={handleRegister}
          onTriggerBiometric={
            savedBiometricSession ? loginWithBiometric : undefined
          }
        />
      </WidgetErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
});
