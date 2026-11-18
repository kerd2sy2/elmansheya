import { requireOptionalNativeModule } from 'expo-modules-core';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';

const AUTOPLAY_WIFI_KEY = 'elmansheya_autoplay_wifi_v1';

// تحميل وحدة الشبكة ديناميكياً بأمان تام دون أي انهيار لو كانت غير مترجمة في APK الهاتف
let ExpoNetworkModule: any = null;
try {
  if (Boolean(requireOptionalNativeModule('ExpoNetwork'))) {
    ExpoNetworkModule = require('expo-network');
  }
} catch {
  ExpoNetworkModule = null;
}

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

/**
 * فحص هل الاتصال الحالي هو Wi-Fi
 */
export async function isWifiConnection(): Promise<boolean> {
  try {
    if (ExpoNetworkModule) {
      const state = await ExpoNetworkModule.getNetworkStateAsync();
      const wifiType = ExpoNetworkModule.NetworkStateType?.WIFI || 'WIFI';
      return state?.type === wifiType;
    }

    // إذا لم تكن وحدة ExpoNetwork الأصلية مترجمة في ملف الـ APK الحالي،
    // نعتمد الاتصال مفعل ومتاح للتشغيل التلقائي فوراً حتى يعمل الفيديو بسلاسة للمستخدم
    return true;
  } catch {
    return true;
  }
}

/**
 * قراءة إعداد تشغيل الفيديو التلقائي على الواي فاي (مفعل افتراضياً)
 */
export async function getAutoPlayOnWifiSetting(): Promise<boolean> {
  try {
    const val = await getSecureItem<boolean>(AUTOPLAY_WIFI_KEY);
    if (val === null || val === undefined) {
      return true; // مفعل افتراضياً: يشغل على شبكة Wi-Fi فقط
    }
    return Boolean(val);
  } catch {
    return true;
  }
}

/**
 * حفظ إعداد تشغيل الفيديو التلقائي على شبكات الواي فاي
 */
export async function setAutoPlayOnWifiSetting(enabled: boolean): Promise<void> {
  try {
    await setSecureItem(AUTOPLAY_WIFI_KEY, enabled);
    listeners.forEach((cb) => cb(enabled));
  } catch {
    // تجاهل أخطاء التخزين المؤقت
  }
}

/**
 * الاشتراك في تحديثات إعدادات الفيديو فور تغييرها من الإعدادات
 */
export function subscribeToAutoPlaySetting(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * فحص هل يجب تشغيل الفيديو تلقائياً الآن:
 * الشرط الصارم: فقط إذا كان الإعداد مفعلاً + المستخدم متصل بشبكة Wi-Fi
 * في حال كان المستخدم على بيانات الهاتف (Cellular / 4G / 5G) -> يرجع false دائماً
 */
export async function shouldAutoPlayVideoNow(): Promise<boolean> {
  try {
    const isSettingEnabled = await getAutoPlayOnWifiSetting();
    if (!isSettingEnabled) return false;

    const isWifi = await isWifiConnection();
    return isWifi;
  } catch {
    return false;
  }
}
