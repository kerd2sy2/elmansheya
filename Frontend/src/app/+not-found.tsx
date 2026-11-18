import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/lottie/not_found_404.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 320,
    height: 320,
  },
});
