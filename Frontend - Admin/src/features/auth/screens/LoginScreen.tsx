import LottieView from 'lottie-react-native';
import React from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { LoginFormCard } from '../components/LoginFormCard';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const topInset = useSafeTopInset();
  const { login, register, loginWithBiometric, savedBiometricSession } = useAuth();

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
    area: string
  ) => {
    return register({
      full_name: fullName,
      phone,
      password,
      area,
    });
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}>
          {/* حاوية متوسطة الشاشة رأسياً وأفقياً تضم الشعار والكرت */}
          <View style={styles.centerContainer}>
            {/* الشعار بحجم متناسق ومضبوط فوق الكرت مباشرة */}
            <View style={styles.logoWrap}>
              <LottieView
                source={require('../../../../assets/json/logo_static.json')}
                autoPlay={false}
                loop={false}
                style={styles.logoImage}
              />
            </View>

            {/* كرت تسجيل الدخول في المنتصف */}
            <WidgetErrorBoundary widgetNameAr="نموذج تسجيل الدخول">
              <LoginFormCard
                onLoginSubmit={handleLogin}
                onRegisterSubmit={handleRegister}
                onTriggerBiometric={
                  savedBiometricSession ? loginWithBiometric : undefined
                }
              />
            </WidgetErrorBoundary>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  centerContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 82,
    height: 82,
  },
});
