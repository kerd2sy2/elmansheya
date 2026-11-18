import { useEffect, useRef } from 'react';
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
  const isAnimating = useRef(false);
  const scrollDelta = useRef(0);

  const headerOpacity = headerTranslateY.interpolate({
    inputRange: [-headerHeight * 0.7, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const hideHeader = () => {
    if (isHeaderHidden.current || isAnimating.current) return;
    isHeaderHidden.current = true;
    isAnimating.current = true;
    Animated.timing(headerTranslateY, {
      toValue: -headerHeight,
      duration: 260,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const showHeader = () => {
    if (!isHeaderHidden.current || isAnimating.current) return;
    isHeaderHidden.current = false;
    isAnimating.current = true;
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const handleScrollHeader = (currentY: number) => {
    // أ) إذا كان المستخدم في قمة الصفحة (<= 15px): أظهر الهيدر فوراً
    if (currentY <= 15) {
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 180,
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

    // ب) السحب لأسفل (Scroll Down): إخفاء ناعم بعد تحرك فعلي 18px وتجاوز 50px من القمة
    if (diff > 0 && currentY > 50) {
      scrollDelta.current = Math.max(0, scrollDelta.current + diff);
      if (scrollDelta.current >= 18) {
        scrollDelta.current = 0;
        hideHeader();
      }
    } else if (diff < 0) {
      // ج) السحب لأعلى (Scroll Up): إظهار فوري وسلس بعد تحرك 16px للأعلى
      scrollDelta.current = Math.min(0, scrollDelta.current + diff);
      if (scrollDelta.current <= -16) {
        scrollDelta.current = 0;
        showHeader();
      }
    }
  };

  useEffect(() => {
    return registerHomeScrollToTop(() => {
      onScrollToTopRequest?.();
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
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
