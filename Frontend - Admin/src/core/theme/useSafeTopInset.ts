import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * دالة موحدة لحساب الإزاحة العلوية الآمنة (Top Safe Inset).
 * تقضي نهائياً على أي وميض أو قفز للهيدر (Zero-Jitter Anti-Flicker) على أندرويد
 * بالاعتماد المتزامن الفوري على StatusBar.currentHeight الثابت من أول فريم،
 * دون أي تأخير ناتج عن OnPreDrawListener أو إعادة تهيئة الشاشات.
 */
export function useSafeTopInset(): number {
  const insets = useSafeAreaInsets();
  const androidStatusBarHeight =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
  return Math.max(insets.top, androidStatusBarHeight);
}

/**
 * يحسب الحاشية السفلية (paddingBottom) لمحتوى الـ ScrollView بحيث تمر الكروت خلف
 * النافبار الشفاف أثناء التمرير، وعند الوصول لآخر الشاشة تتوقف الكروت على بُعد 5 بكسل بالضبط فوق النافبار.
 */
export function useSafeBottomTabPadding(): number {
  const insets = useSafeAreaInsets();
  const bottomMargin = (insets.bottom > 0 ? insets.bottom : 0) + 10;
  const navbarHeight = 48;
  return bottomMargin + navbarHeight + 5;
}
