import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';
import { AuthModal } from '../components/AuthModal';
import { WelcomeOnboarding } from '../components/WelcomeOnboarding';
import { useAuth } from '../context/AuthContext';

const ONBOARDING_SEEN_KEY = 'elmansheya_has_seen_onboarding_v1';

export function LoginScreen() {
  const { login, register, loginWithBiometric, savedBiometricSession } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState<boolean>(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getSecureItem<{ seen: boolean }>(ONBOARDING_SEEN_KEY).then((data) => {
      if (active) {
        setHasSeenOnboarding(Boolean(data?.seen));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleStartAuth = async () => {
    await setSecureItem(ONBOARDING_SEEN_KEY, { seen: true });
    setHasSeenOnboarding(true);
    setShowAuthModal(true);
  };

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
      {/* إذا لم يشاهد جولة الترحيب من قبل، نعرضها له مرة واحدة فقط */}
      {hasSeenOnboarding === false ? (
        <WelcomeOnboarding onStartAuth={handleStartAuth} />
      ) : (
        /* شاشة تسجيل الدخول المباشرة الدائمة لمنع تكرار شاشات الترحيب */
        <View style={styles.directLoginCard}>
          <View style={styles.logoBadge}>
            <Ionicons name="chatbubble-ellipses" size={48} color="#22c55e" />
          </View>
          <Text style={styles.welcomeTitle}>تطبيق المنشية</Text>
          <Text style={styles.welcomeSubtitle}>
            المنصة الرقمية الموحدة لخدمات أهالي قرية المنشية الكبرى
          </Text>

          <Pressable
            style={styles.openAuthBtn}
            onPress={() => setShowAuthModal(true)}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
            <Text style={styles.openAuthBtnText}>
              تسجيل الدخول عبر واتساب 💬
            </Text>
          </Pressable>

          <Pressable
            style={styles.tourBtn}
            onPress={() => setHasSeenOnboarding(false)}
          >
            <Ionicons name="sparkles-outline" size={16} color="#0284c7" />
            <Text style={styles.tourBtnText}>عرض جولة في مزايا التطبيق 📖</Text>
          </Pressable>
        </View>
      )}

      {/* نافذة التوثيق عبر واتساب المباشرة */}
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
    backgroundColor: '#0f172a',
  },
  directLoginCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 32,
  },
  openAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    width: '100%',
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  openAuthBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tourBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
});
