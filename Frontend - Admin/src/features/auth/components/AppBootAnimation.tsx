import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function AppBootAnimation() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.animBox, { opacity: fadeAnim }]}>
        <LottieView
          source={require('../../../../assets/json/logo_white.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#973c00', // لون الخلفية هو لون الأنيميشن الحالي
    justifyContent: 'center',
    alignItems: 'center',
  },
  animBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 120,
    height: 120,
  },
});
