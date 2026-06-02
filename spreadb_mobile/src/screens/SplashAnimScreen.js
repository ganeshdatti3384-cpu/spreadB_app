import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

// Each letter animates independently
const LETTERS = ['S', 'p', 'r', 'e', 'a', 'd', 'B'];

export default function SplashAnimScreen({ onFinish }) {
  const letterAnims = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger each letter dropping in
    const letterAnimations = LETTERS.map((_, i) =>
      Animated.spring(letterAnims[i], {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay: i * 80,
        useNativeDriver: true,
      })
    );

    Animated.sequence([
      // Letters appear one by one
      Animated.stagger(80, letterAnimations),
      // Scale pulse
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      // Tagline fades in
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Dot bounces
      Animated.spring(dotAnim, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(600),
      // Exit fade
      Animated.timing(exitAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish && onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      {/* Background pattern */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Logo letters */}
      <Animated.View style={[styles.logoRow, { transform: [{ scale: scaleAnim }] }]}>
        {LETTERS.map((letter, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.letter,
              letter === 'B' && styles.letterAccent,
              {
                opacity: letterAnims[i],
                transform: [
                  {
                    translateY: letterAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-40, 0],
                    }),
                  },
                  {
                    scale: letterAnims[i].interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.1, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}

        {/* Animated dot */}
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnim,
              transform: [
                {
                  scale: dotAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1.4, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
        Connect · Collaborate · Grow
      </Animated.Text>

      {/* Bottom indicator */}
      <Animated.View style={[styles.bottomDots, { opacity: taglineAnim }]}>
        <View style={[styles.bottomDot, styles.bottomDotActive]} />
        <View style={styles.bottomDot} />
        <View style={styles.bottomDot} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: COLORS.primary,
    opacity: 0.08, top: -120, right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.primaryMid,
    opacity: 0.06, bottom: -80, left: -80,
  },
  bgCircle3: {
    position: 'absolute',
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: COLORS.primary,
    opacity: 0.1, top: '40%', left: '60%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  letter: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  letterAccent: {
    color: COLORS.primaryMid,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginBottom: 8, marginLeft: 2,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  bottomDots: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 6,
  },
  bottomDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bottomDotActive: {
    width: 20,
    backgroundColor: COLORS.primary,
  },
});
