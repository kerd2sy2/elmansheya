import { useEffect, useRef } from 'react';
import { Animated, Easing, Keyboard, Platform } from 'react-native';

/**
 * هوك مخصص لحساب ارتفاع الكيبورد بحركة ناعمة وانسيابية (Cubic-Bezier Easing)
 * يمنع تماماً "نطرة" أو قفز الموديولات المفاجئ ويحافظ على ظهور حقول الإدخال كاملة فوق الكيبورد
 */
export function useSmoothKeyboardOffset(extraBottomMargin: number = 0) {
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // في iOS نستخدم willShow لتبدأ الحركة فوراً بالتزامن التام مع صعود الكيبورد
    // في Android نستخدم willShow إن توفر مع fallback إلى didShow لضمان دعم كافة أجهزة أندرويد
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height ?? 0;
      const duration = Platform.OS === 'ios' ? (e?.duration || 260) : 220;

      Animated.timing(keyboardHeight, {
        toValue: Math.max(0, height - extraBottomMargin),
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: any) => {
      const duration = Platform.OS === 'ios' ? (e?.duration || 220) : 180;

      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [extraBottomMargin, keyboardHeight]);

  return keyboardHeight;
}
