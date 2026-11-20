import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { registerHomeScrollToTop } from '@/core/events/scrollEvents';

interface UseCollapsibleHeaderOptions {
  headerHeight: number;
  onScrollToTopRequest?: () => void;
}

export function useCollapsibleHeader({
  headerHeight,
  onScrollToTopRequest,
}: UseCollapsibleHeaderOptions) {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHeaderHidden = useRef(false);
  const scrollDelta = useRef(0);

  const headerOpacity = useMemo(() => {
    return headerTranslateY.interpolate({
      inputRange: [-headerHeight * 0.75, 0],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  }, [headerHeight, headerTranslateY]);

  const hideHeader = useCallback(() => {
    if (isHeaderHidden.current) return;
    isHeaderHidden.current = true;
    headerTranslateY.stopAnimation();
    Animated.timing(headerTranslateY, {
      toValue: -headerHeight,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [headerHeight, headerTranslateY]);

  const showHeader = useCallback(() => {
    if (!isHeaderHidden.current) return;
    isHeaderHidden.current = false;
    headerTranslateY.stopAnimation();
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [headerTranslateY]);

  const handleScrollHeader = useCallback(
    (currentY: number) => {
      // أ) إذا كان المستخدم في قمة الصفحة أو السحب لأسفل للتحديث (<= 20px): إظهار فوري ناعم
      if (currentY <= 20) {
        if (isHeaderHidden.current) {
          isHeaderHidden.current = false;
          headerTranslateY.stopAnimation();
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        }
        scrollDelta.current = 0;
        lastScrollY.current = currentY;
        return;
      }

      const diff = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      // ب) السحب لأسفل (Scroll Down): إخفاء ناعم بعد تحرك فعلي 22px وتجاوز 55px من القمة
      if (diff > 0 && currentY > 55) {
        scrollDelta.current = Math.max(0, scrollDelta.current + diff);
        if (scrollDelta.current >= 22) {
          scrollDelta.current = 0;
          hideHeader();
        }
      } else if (diff < 0) {
        // ج) السحب لأعلى (Scroll Up / Swiping Down): إظهار فوري فائق السلاسة
        scrollDelta.current = Math.min(0, scrollDelta.current + diff);
        if (scrollDelta.current <= -14) {
          scrollDelta.current = 0;
          showHeader();
        }
      }
    },
    [hideHeader, showHeader, headerTranslateY]
  );

  useEffect(() => {
    return registerHomeScrollToTop(() => {
      onScrollToTopRequest?.();
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        headerTranslateY.stopAnimation();
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
        scrollDelta.current = 0;
      }
    });
  }, [headerTranslateY, onScrollToTopRequest]);

  return {
    headerTranslateY,
    headerOpacity,
    isHeaderHidden,
    lastScrollY,
    handleScrollHeader,
    showHeader,
    hideHeader,
  };
}
