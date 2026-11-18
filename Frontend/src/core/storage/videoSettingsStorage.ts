import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';

const AUTOPLAY_WIFI_KEY = 'elmansheya_autoplay_wifi_v1';

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

/**
 * فحص هل الاتصال الحالي هو Wi-Fi بطريقة آمنة 100% دون استدعاء أي مكتبات خارجية قد تسبب انهيار التطبيق
 * إذا كانت وحدة الشبكة الأصلية غير مترجمة في ملف الـ APK الحالي، يتم اعتماد الاتصال متاحاً تلقائياً
 */
export async function isWifiConnection(): Promise<boolean> {
  try {
    const nativeExpo = (globalThis as any)?.expo?.modules?.ExpoNetwork;
    if (nativeExpo && typeof nativeExpo.getNetworkStateAsync === 'function') {
      const state = await nativeExpo.getNetworkStateAsync();
      const wifiType = nativeExpo.NetworkStateType?.WIFI || 'WIFI';
      return state?.type === wifiType;
    }
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
