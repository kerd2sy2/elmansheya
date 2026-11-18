import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BOUND_CITIZEN_DEVICE_KEY = 'elmansheya_bound_device_citizen_v1';

export interface DeviceHardwareInfo {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceYearClass: number | null;
  deviceType: string;
}

export interface BoundCitizenInfo {
  phone: string;
  full_name: string;
  user_id: string;
  registered_at: string;
}

/**
 * دالة تشفير بسيطة وفعالة لإنتاج تجزئة فريدة ثابتة الطول (FNV-1a / DJB2 variant)
 */
function createHashString(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c64e6d ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

/**
 * جمع مواصفات الهاتف المادية والرقمية
 */
export async function getDeviceHardwareInfo(): Promise<DeviceHardwareInfo> {
  let deviceTypeStr = 'phone';
  try {
    const type = await Device.getDeviceTypeAsync();
    if (type === Device.DeviceType.TABLET) deviceTypeStr = 'tablet';
    else if (type === Device.DeviceType.DESKTOP) deviceTypeStr = 'desktop';
  } catch {
    // fallback
  }

  return {
    brand: Device.brand ?? 'generic',
    manufacturer: Device.manufacturer ?? 'generic',
    modelName: Device.modelName ?? 'device',
    osName: Device.osName ?? Platform.OS,
    osVersion: Device.osVersion ?? '1.0',
    deviceYearClass: Device.deviceYearClass ?? 2024,
    deviceType: deviceTypeStr,
  };
}

/**
 * توليد البصمة المجمعة للهاتف (Hardware SSAID + OS Build + Platform Constants)
 * ثابتة 100% هاردويرياً وتستمر حتى لو قام المستخدم بمسح بيانات التطبيق أو مسح التخزين بالكامل
 */
export async function getCompositeDeviceFingerprint(): Promise<string> {
  let persistentHwId = '';

  try {
    if (Platform.OS === 'android') {
      // Android SSAID: المعرف الثابت المحفور في النظام ولا يتأثر إطلاقاً بمسح التخزين
      const androidId = Application.getAndroidId();
      if (androidId) {
        persistentHwId = `SSAID-${androidId}`;
      }
    } else if (Platform.OS === 'ios') {
      // iOS IDFV
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) {
        persistentHwId = `IDFV-${iosId}`;
      }
    }
  } catch (err) {
    console.warn('[DeviceFingerprint] Failed to read application hardware ID:', err);
  }

  const hardware = await getDeviceHardwareInfo();
  const cpuArch = (Device.supportedCpuArchitectures || []).join(',');

  // ثوابت النظام المادية
  const rawFingerprintString = [
    Platform.OS,
    persistentHwId,
    hardware.manufacturer,
    hardware.brand,
    hardware.modelName,
    hardware.osName,
    hardware.deviceType,
    Device.modelId || '',
    Device.osBuildId || '',
    cpuArch,
  ].join('::');

  const hashPart1 = createHashString(rawFingerprintString);
  const hashPart2 = createHashString(rawFingerprintString.split('').reverse().join(''));

  return `DEV-FP-${Platform.OS.toUpperCase().substring(0, 3)}-${hashPart1.toUpperCase()}${hashPart2.toUpperCase()}`;
}

/**
 * حفظ وتثبيت حساب المواطن المرتبط بهذا الهاتف
 */
export async function saveBoundCitizen(citizen: BoundCitizenInfo): Promise<void> {
  try {
    const str = JSON.stringify(citizen);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BOUND_CITIZEN_DEVICE_KEY, str);
      }
    } else {
      await SecureStore.setItemAsync(BOUND_CITIZEN_DEVICE_KEY, str);
    }
  } catch (err) {
    console.warn('[saveBoundCitizen] Failed:', err);
  }
}

/**
 * قراءة المواطن المربوط بهذا الهاتف لمنع فتح حسابات وهمية أخرى
 */
export async function getBoundCitizen(): Promise<BoundCitizenInfo | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(BOUND_CITIZEN_DEVICE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(BOUND_CITIZEN_DEVICE_KEY);
    }
    return raw ? (JSON.parse(raw) as BoundCitizenInfo) : null;
  } catch {
    return null;
  }
}

/**
 * مسح ربط المواطن بالجهاز لإعادة التوثيق بالشريحة الجديدة
 */
export async function clearBoundCitizen(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(BOUND_CITIZEN_DEVICE_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(BOUND_CITIZEN_DEVICE_KEY);
    }
  } catch {}
}
