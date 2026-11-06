import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Must match the expo-splash-screen plugin config in app.json so the hand-off
// from the native splash to this overlay is seamless.
const BRAND_COLOR = '#A43C21';
const LOGO_SIZE = 220;
const DURATION = 1300;

// Karavan logo intro: the logo settles in (slight dip + pulse), then zooms
// through the screen while the brand backdrop fades to reveal the portal.
const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  25: {
    transform: [{ scale: 0.86 }],
    opacity: 1,
    easing: Easing.inOut(Easing.quad),
  },
  50: {
    transform: [{ scale: 1.06 }],
    opacity: 1,
    easing: Easing.out(Easing.back(2)),
  },
  60: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.inOut(Easing.quad),
  },
  100: {
    transform: [{ scale: 6 }],
    opacity: 0,
    easing: Easing.in(Easing.cubic),
  },
});

const backdropKeyframe = new Keyframe({
  0: {
    opacity: 1,
  },
  65: {
    opacity: 1,
  },
  100: {
    opacity: 0,
    easing: Easing.out(Easing.quad),
  },
});

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const image = <Image style={styles.image} source={require('@/assets/images/karavan-icon.png')} />;

  if (!animate) {
    // Identical to the native splash; once laid out, hide the native one and
    // start the animation so there's no visible jump.
    return (
      <View
        onLayout={() => {
          SplashScreen.hideAsync().finally(() => {
            setAnimate(true);
          });
        }}
        style={styles.splashOverlay}>
        {image}
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      entering={backdropKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      <Animated.View entering={logoKeyframe.duration(DURATION)}>{image}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
