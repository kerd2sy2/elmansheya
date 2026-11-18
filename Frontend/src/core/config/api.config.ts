import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // الدومين السحابي الرسمي الحقيقي المحمي بـ Cloudflare SSL
  return 'https://elmansheya.kerd2sy.com/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();
