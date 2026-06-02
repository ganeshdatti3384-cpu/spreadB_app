import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Floating Particle Component
const FloatingSparkle = ({ delay, x, size, color, duration }) => {
  const translateY = useRef(new Animated.Value(height + 50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Horizontal sway animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 25,
          duration: duration / 2,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -25,
          duration: duration / 2,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Vertical float and fade sequence
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -50,
          duration,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.15, useNativeDriver: true }),
          Animated.delay(duration * 0.7),
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.15, useNativeDriver: true }),
        ]),
        Animated.timing(scale, {
          toValue: 1.2,
          duration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { scale }],
        shadowColor: color,
        shadowOpacity: 0.8,
        shadowRadius: size,
        elevation: 2,
      }}
    />
  );
};

// Ethereal Pulsing Ripples (Representing "Spread")
const RippleRing = ({ delay, size }) => {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.8,
            duration: 2500,
            easing: Easing.bezier(0.215, 0.61, 0.355, 1),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.rippleRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

const LETTERS = ['S', 'p', 'r', 'e', 'a', 'd', 'B'];

const sparkles = [
  { x: width * 0.15, size: 6, color: '#10B981', delay: 100, duration: 3200 },
  { x: width * 0.3, size: 4, color: '#8B5CF6', delay: 400, duration: 2800 },
  { x: width * 0.45, size: 8, color: '#10B981', delay: 200, duration: 3600 },
  { x: width * 0.6, size: 5, color: '#FFFFFF', delay: 600, duration: 3000 },
  { x: width * 0.75, size: 7, color: '#3B82F6', delay: 300, duration: 3400 },
  { x: width * 0.85, size: 4, color: '#10B981', delay: 500, duration: 2600 },
  { x: width * 0.25, size: 5, color: '#FFFFFF', delay: 800, duration: 3300 },
  { x: width * 0.65, size: 6, color: '#8B5CF6', delay: 150, duration: 3500 },
];

export default function SplashScreen({ onFinish }) {
  // Exit/intro animations
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  
  // Aurora orbs loops
  const orb1Tx = useRef(new Animated.Value(0)).current;
  const orb1Ty = useRef(new Animated.Value(0)).current;
  const orb2Tx = useRef(new Animated.Value(0)).current;
  const orb2Ty = useRef(new Animated.Value(0)).current;
  const orb3Tx = useRef(new Animated.Value(0)).current;
  const orb3Ty = useRef(new Animated.Value(0)).current;

  // Logo items animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoBreath = useRef(new Animated.Value(1)).current;
  
  // Stagger letters
  const letterAnims = useRef(LETTERS.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(40),
    rotate: new Animated.Value(0),
  }))).current;

  // Tagline and loader anims
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(15)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Trigger Aurora loop animations
    const triggerOrbLoop = (tx, ty, txVal, tyVal, duration) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(tx, { toValue: txVal, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(tx, { toValue: -txVal, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(tx, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ty, { toValue: tyVal, duration: duration * 1.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(ty, { toValue: -tyVal, duration: duration * 1.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(ty, { toValue: 0, duration: duration * 1.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
        ])
      ).start();
    };

    triggerOrbLoop(orb1Tx, orb1Ty, 60, 100, 8000);
    triggerOrbLoop(orb2Tx, orb2Ty, -80, -70, 10000);
    triggerOrbLoop(orb3Tx, orb3Ty, 50, -90, 9000);

    // 2. Logo Icon Breathing Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoBreath, { toValue: 1.06, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoBreath, { toValue: 0.96, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // 3. Staggered Entrance Sequence
    const letterSequence = LETTERS.map((_, i) =>
      Animated.parallel([
        Animated.spring(letterAnims[i].opacity, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
        Animated.spring(letterAnims[i].translateY, { toValue: 0, tension: 70, friction: 7, useNativeDriver: true }),
        Animated.spring(letterAnims[i].rotate, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      ])
    );

    Animated.sequence([
      Animated.delay(100),
      // Logo Icon zoom-in with rotation
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 1, duration: 800, easing: Easing.bezier(0.175, 0.885, 0.32, 1.275), useNativeDriver: true }),
      ]),
      // Letters drop in staggered
      Animated.stagger(60, letterSequence),
      // Tagline and loader appear
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(loaderOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // Load progress bar (2200ms duration for premium speed, 100% native)
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.bezier(0.455, 0.03, 0.515, 0.955),
        useNativeDriver: true,
      }),
      Animated.delay(500),
      // Exit zoom and fade
      Animated.parallel([
        Animated.timing(exitOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(exitScale, { toValue: 1.08, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: exitOpacity,
          transform: [{ scale: exitScale }]
        }
      ]}
    >
      {/* Black backdrop */}
      <View style={styles.darkBackdrop} />

      {/* Aurora Glow Orbs */}
      <Animated.View style={[styles.auroraOrb, styles.orbGreen, { transform: [{ translateX: orb1Tx }, { translateY: orb1Ty }] }]} />
      <Animated.View style={[styles.auroraOrb, styles.orbPurple, { transform: [{ translateX: orb2Tx }, { translateY: orb2Ty }] }]} />
      <Animated.View style={[styles.auroraOrb, styles.orbBlue, { transform: [{ translateX: orb3Tx }, { translateY: orb3Ty }] }]} />

      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <FloatingSparkle key={i} {...s} />
      ))}

      {/* Glassmorphic Card Container */}
      <View style={styles.glassCard}>
        {/* Pulse rings behind logo icon */}
        <View style={styles.rippleContainer}>
          <RippleRing delay={0} size={150} />
          <RippleRing delay={700} size={200} />
          <RippleRing delay={1400} size={250} />
        </View>

        {/* Brand Logo Icon */}
        <Animated.View style={{ opacity: logoScale, transform: [{ scale: logoScale }] }}>
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [
                  { scale: logoBreath },
                  {
                    rotate: logoRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-120deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="megaphone" size={26} color="#FFFFFF" style={styles.iconGraphic} />
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Brand Letters */}
        <View style={styles.lettersContainer}>
          {LETTERS.map((letter, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letterText,
                letter === 'B' && styles.letterAccent,
                {
                  opacity: letterAnims[i].opacity,
                  transform: [
                    { translateY: letterAnims[i].translateY },
                    {
                      scale: letterAnims[i].opacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                    {
                      rotate: letterAnims[i].rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['25deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>

        {/* Underline decorative bar */}
        <Animated.View style={[styles.underlineTrack, { opacity: loaderOpacity }]}>
          <Animated.View
            style={[
              styles.underlineProgress,
              {
                transform: [
                  {
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-140, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>

        {/* Dynamic Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineSlide }],
            },
          ]}
        >
          INFLUENCE  •  COLLABORATE  •  GROW
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070A13',
  },
  // Aurora Glows
  auroraOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.12,
  },
  orbGreen: {
    backgroundColor: '#10B981',
    top: height * 0.15,
    left: -80,
  },
  orbPurple: {
    backgroundColor: '#8B5CF6',
    bottom: height * 0.18,
    right: -100,
  },
  orbBlue: {
    backgroundColor: '#3B82F6',
    top: height * 0.45,
    right: -60,
  },
  // Ripples
  rippleContainer: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 250,
    zIndex: -1,
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  // Glassmorphic Logo Card
  glassCard: {
    width: width * 0.86,
    paddingVertical: 45,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  // Mega Logo Icon
  iconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 22,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGraphic: {
    transform: [{ rotate: '-10deg' }],
  },
  // Letters Styling
  lettersContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  letterText: {
    fontSize: 46,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  letterAccent: {
    color: '#10B981',
    textShadowColor: 'rgba(16, 185, 129, 0.65)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  // Underline
  underlineTrack: {
    width: 140,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  underlineProgress: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  // Tagline
  tagline: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
