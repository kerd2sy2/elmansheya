import React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';

export const BASE_HEADER_HEIGHT = 60;

interface NewsHomeHeaderProps {
  topInset: number;
  headerTranslateY: Animated.Value;
  headerOpacity: Animated.AnimatedInterpolation<number>;
  showSearch: boolean;
  searchQuery: string;
  unreadCount: number;
  lottieRef: React.RefObject<LottieView | null>;
  onPressLogo: () => void;
  onToggleSearch: () => void;
  onChangeSearch: (query: string) => void;
  onClearSearch: () => void;
  onPressNotifications: () => void;
}

export function NewsHomeHeader({
  topInset,
  headerTranslateY,
  headerOpacity,
  showSearch,
  searchQuery,
  unreadCount,
  lottieRef,
  onPressLogo,
  onToggleSearch,
  onChangeSearch,
  onClearSearch,
  onPressNotifications,
}: NewsHomeHeaderProps) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.collapsibleHeaderWrap,
        {
          top: topInset,
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        },
      ]}>
      <View style={styles.headerRow} pointerEvents="box-none">
        {/* في اليمين: اللوجو تفاعلي عند النقر يشغل الأنميشن ويصعد لأعلى ويحدث الصفحة */}
        <Pressable
          style={({ pressed }) => [
            styles.headerRightGroup,
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
          onPress={onPressLogo}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="العودة لأعلى الأخبار وتحديث الصفحة">
          <LottieView
            ref={lottieRef}
            source={require('../../../../assets/json/logo.json')}
            autoPlay={false}
            loop={false}
            progress={1}
            style={styles.headerLottie}
          />
        </Pressable>

        {/* في الشمال: عدسة البحث + جرس التنبيهات */}
        <View style={styles.headerLeftGroup} pointerEvents="auto">
          <Pressable
            style={styles.headerIconButton}
            onPress={onToggleSearch}
            accessibilityRole="button"
            accessibilityLabel="البحث في الأخبار">
            <Ionicons
              name={showSearch ? 'close-outline' : 'search-outline'}
              size={23}
              color={showSearch ? '#973c00' : '#1E293B'}
            />
          </Pressable>

          <Pressable
            style={styles.headerIconButton}
            onPress={onPressNotifications}
            accessibilityRole="button"
            accessibilityLabel="الإشعارات والتنبيهات">
            <Ionicons name="notifications-outline" size={23} color="#1E293B" />
            {unreadCount > 0 ? (
              <View style={styles.notifCountBadge}>
                <Text style={styles.notifCountText}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* حقل البحث السريع في الأخبار */}
      {showSearch ? (
        <View style={styles.searchBarWrap} pointerEvents="auto">
          <Ionicons name="search-outline" size={20} color="#973c00" />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث في أخبار القرية بالعنوان أو النص..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={onChangeSearch}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              onPress={onClearSearch}
              hitSlop={10}
              style={styles.clearSearchBtn}
              accessibilityRole="button"
              accessibilityLabel="مسح نص البحث">
              <Ionicons name="close-circle" size={19} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  collapsibleHeaderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#FAF5EE',
  },
  headerRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerRightGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLottie: {
    width: 44,
    height: 44,
  },
  headerLeftGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  notifCountBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FAF5EE',
  },
  notifCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  searchBarWrap: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  clearSearchBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
