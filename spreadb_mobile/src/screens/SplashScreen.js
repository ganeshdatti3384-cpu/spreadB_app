import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Floating particle component
const Particle = ({ delay, x, size, color, duration }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1, duration, easing: Easing.linear, useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(duration - 600),
          Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacityAnim,
        transform: [{
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [height + 20, -20],
          }),
        }, {
          scale: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.5, 1.2, 0.3],
          }),
        }],
      }}
    />
  );
};

// Ring pulse component
const PulseRing = ({ delay, size, color }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1, duration: 1500,
            easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0, duration: 1500, useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: color,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    />
  );
};

const LETTERS = ['S', 'p', 'r', 'e', 'a', 'd', 'B'];

const particles = [
  { x: 30, size: 6, color: 'rgba(20,168,0,0.6)', delay: 200, duration: 2500 },
  { x: 80, size: 4, color: 'rgba(20,168,0,0.4)', delay: 400, duration: 2000 },
  { x: 150, size: 8, color: 'rgba(20,168,0,0.5)', delay: 100, duration: 2800 },
  { x: 220, size: 5, color: 'rgba(255,255,255,0.3)', delay: 600, duration: 2200 },
  { x: 280, size: 7, color: 'rgba(20,168,0,0.4)', delay: 300, duration: 2600 },
  { x: 320, size: 4, color: 'rgba(255,255,255,0.2)', delay: 500, duration: 1900 },
  { x: 60, size: 5, color: 'rgba(20,168,0,0.3)', delay: 700, duration: 2400 },
  { x: 180, size: 6, color: 'rgba(255,255,255,0.25)', delay: 250, duration: 2700 },
  { x: 340, size: 4, color: 'rgba(20,168,0,0.5)', delay: 450, duration: 2100 },
];

export default function SplashScreen({ onFinish }) {
  const letterAnims = useRef(LETTERS.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(30),
    scale: new Animated.Value(0.5),
  }))).current;

  const logoContainerAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;
  const lineWidthAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background color shift
    Animated.timing(bgAnim, {
      toValue: 1, duration: 800, useNativeDriver: false,
    }).start();

    // Stagger letters with spring
    const letterSequence = LETTERS.map((_, i) =>
      Animated.parallel([
        Animated.spring(letterAnims[i].opacity, {
          toValue: 1, tension: 80, friction: 8,
          delay: i * 70, useNativeDriver: true,
        }),
        Animated.spring(letterAnims[i].translateY, {
          toValue: 0, tension: 80, friction: 8,
          delay: i * 70, useNativeDriver: true,
        }),
        Animated.spring(letterAnims[i].scale, {
          toValue: 1, tension: 60, friction: 6,
          delay: i * 70, useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([
      Animated.stagger(70, letterSequence),
      // Underline
      Animated.timing(lineWidthAnim, {
        toValue: 1, duration: 500,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      // Tagline
      Animated.parallel([
        Animated.timing(taglineAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(taglineSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      // Exit — scale up and fade
      Animated.parallel([
        Animated.timing(exitAnim, {
          toValue: 0, duration: 600,
          easing: Easing.in(Easing.ease), useNativeDriver: true,
        }),
        Animated.spring(logoContainerAnim, {
          toValue: 1, tension: 40, friction: 8, useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      <LinearGradient
        colors={['#0A1628', '#0D2010', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* Pulse rings behind logo */}
      <View style={styles.ringContainer}>
        <PulseRing delay={0} size={200} color="rgba(20,168,0,0.3)" />
        <PulseRing delay={500} size={280} color="rgba(20,168,0,0.15)" />
        <PulseRing delay={1000} size={360} color="rgba(20,168,0,0.08)" />
      </View>

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            transform: [{
              scale: logoContainerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.15],
              }),
            }],
          },
        ]}
      >
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconInner}>
            <View style={styles.iconDot} />
            <View style={styles.iconWave1} />
            <View style={styles.iconWave2} />
          </View>
        </View>

        {/* Letters */}
        <View style={styles.lettersRow}>
          {LETTERS.map((letter, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                letter === 'B' && styles.letterAccent,
                {
                  opacity: letterAnims[i].opacity,
                  transform: [
                    { translateY: letterAnims[i].translateY },
                    { scale: letterAnims[i].scale },
                  ],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>

        {/* Underline */}
        <Animated.View
          style={[
            styles.underline,
            {
              width: lineWidthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 140],
              }),
            },
          ]}
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineAnim,
            transform: [{ translateY: taglineSlide }],
          },
        ]}
      >
        Influence · Collaborate · Grow
      </Animated.Text>

      {/* Bottom dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i === 1 && styles.dotActive,
              { opacity: taglineAnim },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  iconInner: {
    alignItems: 'center', justifyContent: 'center',
  },
  iconDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#fff', marginBottom: 4,
  },
  iconWave1: {
    width: 24, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)', marginBottom: 3,
  },
  iconWave2: {
    width: 16, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  letter: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  letterAccent: {
    color: COLORS.primary,
  },
  underline: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 60,
    gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: COLORS.primary,
  },
});
