import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rtlFlexDirection } from '@/core/theme/rtl';

interface TabItemConfig {
  name: string;
  href: string;
  title: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TAB_ITEMS: TabItemConfig[] = [
  {
    name: 'index',
    href: '/',
    title: 'الرئيسية',
    activeIcon: 'speedometer',
    inactiveIcon: 'speedometer-outline',
  },
  {
    name: 'publish',
    href: '/publish',
    title: 'نشر خبر',
    activeIcon: 'add-circle',
    inactiveIcon: 'add-circle-outline',
  },
  {
    name: 'services',
    href: '/services',
    title: 'الخدمات',
    activeIcon: 'grid',
    inactiveIcon: 'grid-outline',
  },
  {
    name: 'craftsmen',
    href: '/craftsmen',
    title: 'الصنايعية',
    activeIcon: 'construct',
    inactiveIcon: 'construct-outline',
  },
  {
    name: 'profile',
    href: '/profile',
    title: 'الإدارة',
    activeIcon: 'shield-checkmark',
    inactiveIcon: 'shield-checkmark-outline',
  },
];

function VillageBottomTabBar(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // رفع النافبار ليكون أعلى شريط أزرار التنقل السفلي بـ 10 بكسل
  const bottomMargin = (insets.bottom > 0 ? insets.bottom : 0) + 10;

  const nav = props?.navigation;
  const state = props?.state;

  return (
    <View pointerEvents="box-none" style={[styles.floatingWrapper, { bottom: bottomMargin }]}>
      {/* كبسولة عائمة زجاجية نقية بيضاء بالكامل (White Glassmorphism) */}
      <View style={styles.capsuleShadowContainer}>
        <View style={styles.capsuleInner}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 85}
            tint="extraLight"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.blurBackdrop} />

          <View style={styles.tabBarInner}>
            {TAB_ITEMS.map((item) => {
              let isFocused = false;
              if (state && Array.isArray(state.routes)) {
                const routeIndex = state.routes.findIndex(
                  (r: { name: string }) => r.name === item.name
                );
                isFocused = state.index === routeIndex;
              } else {
                isFocused =
                  pathname === item.href ||
                  (item.href === '/' && (pathname === '' || pathname === '/index'));
              }

              const onPress = () => {
                if (isFocused) return;

                if (nav && state?.routes) {
                  const route = state.routes.find(
                    (r: { name: string }) => r.name === item.name
                  );
                  if (route) {
                    const event = nav.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!event?.defaultPrevented) {
                      nav.navigate(route.name);
                    }
                    return;
                  }
                }

                try {
                  router.navigate(item.href as any);
                } catch {
                  router.replace(item.href as any);
                }
              };

              return (
                <Pressable
                  key={item.name}
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.tabButton,
                    pressed && styles.tabButtonPressed,
                  ]}>
                  {/* أيقونة نظيفة بدون أي خلفية أو بوكس وبحجم أنحف ومتناسق */}
                  <View style={styles.iconBox}>
                    <Ionicons
                      name={isFocused ? item.activeIcon : item.inactiveIcon}
                      size={20}
                      color={isFocused ? '#973c00' : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      isFocused && styles.tabLabelActive,
                    ]}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const NAVBAR_CAPSULE_HEIGHT = 48;

export default function AppTabs() {
  return (
    <Tabs
      backBehavior="history"
      detachInactiveScreens={false}
      tabBar={(props: any) => <VillageBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: 'none',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="publish" options={{ title: 'نشر خبر' }} />
      <Tabs.Screen name="services" options={{ title: 'الخدمات' }} />
      <Tabs.Screen name="craftsmen" options={{ title: 'الصنايعية' }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'الإدارة' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  capsuleShadowContainer: {
    width: '84%',
    maxWidth: 360,
    borderRadius: 28,
    // إزالة السواد والظلال الداكنة نهائياً من تحت النافبار
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    backgroundColor: 'transparent',
  },
  capsuleInner: {
    height: NAVBAR_CAPSULE_HEIGHT,
    justifyContent: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    backgroundColor:
      Platform.OS === 'android'
        ? 'rgba(255, 255, 255, 0.45)'
        : 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  blurBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor:
      Platform.OS === 'android'
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(255, 255, 255, 0.22)',
  },
  tabBarInner: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 0,
  },
  tabButtonPressed: {
    opacity: 0.6,
  },
  iconBox: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#973c00',
  },
});
