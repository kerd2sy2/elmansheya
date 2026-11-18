import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function getSecureItem<T>(key: string): Promise<T | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      }
      return null;
    }

    const value = await SecureStore.getItemAsync(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (err) {
    console.warn(`[SessionStorage:get] Failed to read key ${key}:`, err);
    return null;
  }
}

export async function setSecureItem(key: string, value: unknown | null): Promise<void> {
  try {
    if (value === null || value === undefined) {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      return;
    }

    const serialized = JSON.stringify(value);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
    } else {
      await SecureStore.setItemAsync(key, serialized);
    }
  } catch (err) {
    console.warn(`[SessionStorage:set] Failed to write key ${key}:`, err);
  }
}

export async function clearSecureItem(key: string): Promise<void> {
  return setSecureItem(key, null);
}
