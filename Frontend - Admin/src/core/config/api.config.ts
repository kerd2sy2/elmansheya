import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // على المتصفح (Web): نستخدم نفس المضيف (أو localhost)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:8080/api/v1`;
    }
    return 'http://localhost:8080/api/v1';
  }

  // على أجهزة المحمول الحقيقية أو المحاكي عبر Expo Go:
  // نستخرج الـ IP لجهاز الكمبيوتر من expo-constants تلقائياً
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } })?.expoGoConfig?.debuggerHost ||
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8080/api/v1`;
    }
  }

  // الدومين السحابي الرسمي الحقيقي المحمي بـ Cloudflare SSL
  return 'https://elmansheya.kerd2sy.com/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();
