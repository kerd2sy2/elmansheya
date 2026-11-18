import { DarkTheme, DefaultTheme, ThemeProvider, usePathname, useRouter } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { BackHandler, I18nManager, Platform, StatusBar as RNStatusBar, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

if (Platform.OS === 'android') {
  (RNStatusBar as any).setTranslucent?.(true);
  (RNStatusBar as any).setBackgroundColor?.('transparent');
  SystemUI.setBackgroundColorAsync('#F8FAFC').catch(() => {});
}

// تفعيل اتجاه اليمين إلى اليسار (RTL) للغة العربية فورياً ومحاذاة الواجهة
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch {
  // ignore
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
}

import AppTabs from '@/components/app-tabs';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { AppBootAnimation } from '@/features/auth/components/AppBootAnimation';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';

SplashScreen.preventAutoHideAsync();

function AppRootGate() {
  const { isBootstrapping, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // إدارة زر الرجوع الفيزيائي في أندرويد (Hardware Back Button)
  useEffect(() => {
    if (!isAuthenticated) return;

    const onHardwareBackPress = () => {
      // إذا كان المستخدم على الشاشة الرئيسية، الخروج من التطبيق فورياً
      const isHome =
        pathname === '/' || pathname === '/index' || pathname === '';
      if (isHome) {
        BackHandler.exitApp();
        return true;
      }

      // إذا كان في أي صفحة أخرى، الرجوع للخطوة السابقة
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      // إذا لم يكن هناك مسار سابق في المكدس، الرجوع إلى الرئيسية
      router.replace('/');
      return true;
    };

    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => sub.remove();
  }, [isAuthenticated, pathname, router]);

  // ١. عند فتح التطبيق: عرض أنميشن البداية حتى يتحقق التطبيق هل المستخدم مسجل دخول أم لا
  if (isBootstrapping) {
    return <AppBootAnimation />;
  }

  // ٢. إذا لم يكن مسجلاً للدخول: عرض شاشة تسجيل الدخول فقط بدون شريط التنقل
  if (!isAuthenticated) {
    return (
      <View style={styles.rootContainer}>
        <ModuleErrorBoundary
          moduleName="auth"
          moduleTitleAr="تسجيل الدخول والمصادقة">
          <LoginScreen />
        </ModuleErrorBoundary>
      </View>
    );
  }

  // ٣. إذا كان مسجلاً للدخول: عرض الشاشة الرئيسية وشريط التنقل المكون من الـ ٥ شاشات
  return (
    <View style={styles.rootContainer}>
      <AppTabs />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="dark" />
          {Platform.OS === 'android' ? <NavigationBar style="dark" /> : null}
          <AppRootGate />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
