import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSafeTopInset } from '@/core/theme/useSafeTopInset';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  badge: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  lottieSource: any;
  lottieLoop?: boolean;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome_1',
    badge: 'المنصة الذكية الرسمية',
    badgeIcon: 'sparkles',
    title: 'أهلاً بك في المنشية',
    subtitle: 'تطبيق المواطن الذكي لحي المنشية',
    description:
      'بوابتك الرقمية الشاملة لمتابعة الخدمات البلدية، تقديم البلاغات، والتواصل الفعال لخدمة أهالي الحي بلمسة واحدة.',
    lottieSource: require('../../../../assets/json/logo.json'),
    lottieLoop: true,
  },
  {
    id: 'welcome_2',
    badge: 'خدمات سريعة وميدانية',
    badgeIcon: 'notifications',
    title: 'صوتك مسموع وبلاغك مُنجز',
    subtitle: 'متابعة لحظية للبلاغات والخدمات',
    description:
      'قدّم بلاغات النظافة والإنارة والمرافق في ثوانٍ مع تتبع مباشر لمراحل التنفيذ من المسؤولين حتى إتمام العمل بنجاح.',
    lottieSource: require('../../../../assets/json/btXbjDx6qo.json'),
    lottieLoop: true,
  },
  {
    id: 'welcome_3',
    badge: 'توثيق وأمان معتمد',
    badgeIcon: 'shield-checkmark',
    title: 'حساب موثوق لكل مواطن',
    subtitle: 'ربط برقم الشريحة وبصمة الجهاز',
    description:
      'توثيق حقيقي برقم شريحة الهاتف المعتمدة على هذا الجهاز لمنع الحسابات الوهمية وضمان وصول الخدمات للمواطنين الحقيقيين.',
    lottieSource: require('../../../../assets/json/H1e3qC7ucu.json'),
    lottieLoop: true,
  },
];

interface WelcomeOnboardingProps {
  onStartAuth: () => void;
}

export function WelcomeOnboarding({ onStartAuth }: WelcomeOnboardingProps) {
  const topInset = useSafeTopInset();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < ONBOARDING_SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      onStartAuth();
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
        {/* شارة التبويب */}
        <View style={styles.badgeWrap}>
          <Ionicons name={item.badgeIcon} size={14} color="#973c00" />
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>

        {/* عرض أنيميشن Lottie */}
        <View style={styles.lottieCard}>
          <LottieView
            source={item.lottieSource}
            autoPlay
            loop={item.lottieLoop ?? true}
            style={styles.lottieAnim}
          />
        </View>

        {/* النصوص التوضيحية */}
        <View style={styles.textContent}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset, 16) }]}>
      {/* شريط علوي بسيط مع زر تخطي */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brandName}>المنشية - المواطن</Text>
        </View>

        <Pressable onPress={onStartAuth} style={styles.skipBtn} hitSlop={10}>
          <Text style={styles.skipBtnText}>تخطي</Text>
        </Pressable>
      </View>

      {/* سلايدر الشاشات الثلاث */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.sliderList}
      />

      {/* شريط التحكم السفلي: النقاط وزر التالي / ابدأ الآن */}
      <View style={styles.bottomBar}>
        {/* مؤشر النقاط (Pagination Dots) */}
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                activeIndex === i ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* الأزرار التفاعلية */}
        <View style={styles.buttonsWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleNext}>
            <Text style={styles.actionBtnText}>
              {activeIndex === ONBOARDING_SLIDES.length - 1
                ? 'ابدأ الآن'
                : 'التالي'}
            </Text>
            <Ionicons
              name={
                activeIndex === ONBOARDING_SLIDES.length - 1
                  ? 'arrow-back'
                  : 'chevron-back'
              }
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5EE',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#973c00',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    writingDirection: 'rtl',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    writingDirection: 'rtl',
  },
  sliderList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  badgeWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#973c00',
    writingDirection: 'rtl',
  },
  lottieCard: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 110,
    marginBottom: 24,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  lottieAnim: {
    width: 170,
    height: 170,
  },
  textContent: {
    alignItems: 'center',
    maxWidth: 340,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#973c00',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    paddingTop: 16,
    gap: 16,
  },
  dotsRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#973c00',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  buttonsWrap: {
    width: '100%',
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#973c00',
    borderRadius: 16,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
