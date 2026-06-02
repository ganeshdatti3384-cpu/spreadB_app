import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, StatusBar, Easing,
} from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    role: 'brand',
    headline: 'Find, manage\n& pay influencers,\nall in one place',
    sub: 'Connect with verified creators who\nmatch your brand perfectly',
    tag: "I'm a brand",
    gradientColors: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000'],
  },
  {
    role: 'influencer',
    headline: 'Find, work,\ncollaborate,\n& get paid\nall in one place',
    sub: 'Turn your influence into\na thriving career',
    tag: "I'm an influencer",
    gradientColors: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000'],
  },
];

// Animated background that simulates video with moving shapes
const AnimatedBackground = ({ role }) => {
  const move1 = useRef(new Animated.Value(0)).current;
  const move2 = useRef(new Animated.Value(0)).current;
  const move3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (anim, duration, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1, duration,
            easing: Easing.inOut(Easing.sin), useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0, duration,
            easing: Easing.inOut(Easing.sin), useNativeDriver: true,
          }),
        ])
      );

    animate(move1, 4000).start();
    animate(move2, 5500, 1000).start();
    animate(move3, 3500, 500).start();
  }, []);

  const isBrand = role === 'brand';

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark base */}
      <View style={[styles.bgBase, { backgroundColor: isBrand ? '#0A1628' : '#0A1A0A' }]} />

      {/* Person 1 silhouette area */}
      <Animated.View
        style={[
          styles.personSilhouette1,
          {
            transform: [{
              translateY: move1.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }),
            }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={styles.silhouetteGrad}
        >
          {/* Head */}
          <View style={styles.silHead} />
          {/* Body */}
          <View style={styles.silBody} />
          {/* Desk */}
          <View style={styles.silDesk} />
        </LinearGradient>
      </Animated.View>

      {/* Person 2 silhouette area */}
      <Animated.View
        style={[
          styles.personSilhouette2,
          {
            transform: [{
              translateY: move2.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }),
            }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(20,168,0,0.12)', 'rgba(20,168,0,0.04)']}
          style={styles.silhouetteGrad}
        >
          <View style={[styles.silHead, { backgroundColor: 'rgba(20,168,0,0.3)' }]} />
          <View style={[styles.silBody, { backgroundColor: 'rgba(20,168,0,0.2)' }]} />
          <View style={styles.silDesk} />
        </LinearGradient>
      </Animated.View>

      {/* Floating connection elements */}
      <Animated.View
        style={[
          styles.floatingCard1,
          {
            transform: [
              { translateY: move3.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              { rotate: move1.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
            ],
          },
        ]}
      >
        <View style={styles.floatingCardInner}>
          <View style={styles.floatingCardDot} />
          <View style={styles.floatingCardLine} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingCard2,
          {
            transform: [
              { translateY: move2.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
            ],
          },
        ]}
      >
        <View style={styles.floatingCardInner}>
          <Ionicons name="trending-up" size={14} color={COLORS.primary} />
          <View style={[styles.floatingCardLine, { width: 40 }]} />
        </View>
      </Animated.View>

      {/* Ambient light blobs */}
      <Animated.View
        style={[
          styles.lightBlob1,
          {
            opacity: move1.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] }),
            transform: [{ scale: move1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.lightBlob2,
          {
            opacity: move2.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.25] }),
          },
        ]}
      />
    </View>
  );
};

export default function WelcomeScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = useState('brand');
  const contentAnim = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  const currentSlide = slides.find((s) => s.role === selectedRole);

  useEffect(() => {
    Animated.spring(btnAnim, {
      toValue: 1, tension: 50, friction: 8, delay: 300, useNativeDriver: true,
    }).start();
  }, []);

  const switchRole = (role) => {
    if (role === selectedRole) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: -10, duration: 180, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setSelectedRole(role);
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Animated background */}
      <AnimatedBackground role={selectedRole} />

      {/* Gradient overlay */}
      <LinearGradient
        colors={currentSlide.gradientColors}
        locations={[0, 0.35, 0.65, 1]}
        style={styles.gradient}
      />

      {/* Logo top */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <View style={styles.logoDot} />
            <View style={styles.logoWave} />
          </View>
          <Text style={styles.logoText}>SpreadB</Text>
        </View>
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentAnim,
            transform: [{ translateY: contentSlide }],
          },
        ]}
      >
        <Text style={styles.headline}>{currentSlide.headline}</Text>
        <Text style={styles.sub}>{currentSlide.sub}</Text>
      </Animated.View>

      {/* Bottom */}
      <Animated.View
        style={[
          styles.bottom,
          {
            opacity: btnAnim,
            transform: [{
              translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
            }],
          },
        ]}
      >
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          {slides.map((s) => (
            <TouchableOpacity
              key={s.role}
              style={[styles.toggleBtn, selectedRole === s.role && styles.toggleActive]}
              onPress={() => switchRole(s.role)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, selectedRole === s.role && styles.toggleTextActive]}>
                {s.tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Create account */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('Signup', {
            role: selectedRole === 'brand' ? 'Brand Owner' : 'Influencer',
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>Create account</Text>
        </TouchableOpacity>

        {/* Login */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Background
  bgBase: { ...StyleSheet.absoluteFillObject },
  personSilhouette1: {
    position: 'absolute',
    left: -20, top: height * 0.08,
    width: width * 0.55, height: height * 0.55,
  },
  personSilhouette2: {
    position: 'absolute',
    right: -20, top: height * 0.12,
    width: width * 0.5, height: height * 0.5,
  },
  silhouetteGrad: {
    flex: 1, borderRadius: 20,
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  silHead: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  silBody: {
    width: 80, height: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 4,
  },
  silDesk: {
    width: 120, height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
  },
  floatingCard1: {
    position: 'absolute',
    top: height * 0.28, left: width * 0.1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  floatingCard2: {
    position: 'absolute',
    top: height * 0.38, right: width * 0.08,
    backgroundColor: 'rgba(20,168,0,0.12)',
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(20,168,0,0.2)',
  },
  floatingCardInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  floatingCardDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  floatingCardLine: {
    width: 50, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  lightBlob1: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.primary,
    top: height * 0.05, left: -80,
  },
  lightBlob2: {
    position: 'absolute',
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#1F57C3',
    top: height * 0.15, right: -80,
  },

  // Gradient
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  // Top bar
  topBar: {
    paddingTop: 56, paddingHorizontal: 24,
    position: 'absolute', top: 0, left: 0, right: 0,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  logoDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#fff', marginBottom: 3,
  },
  logoWave: {
    width: 16, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  logoText: {
    fontSize: 18, fontWeight: '800',
    color: '#fff', letterSpacing: -0.3,
  },

  // Content
  content: {
    position: 'absolute',
    bottom: 220, left: 0, right: 0,
    paddingHorizontal: 24,
  },
  headline: {
    fontSize: 28, fontWeight: '700',
    color: '#FFFFFF', lineHeight: 36,
    marginBottom: 10, letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },

  // Bottom
  bottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 44, paddingTop: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: SIZES.radiusFull,
    padding: 3, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: SIZES.radiusFull, alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#FFFFFF' },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600', fontSize: 13,
  },
  toggleTextActive: { color: COLORS.dark, fontWeight: '700' },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 15, alignItems: 'center',
    marginBottom: 16,
  },
  createBtnText: {
    color: '#fff', fontSize: 14,
    fontWeight: '700', letterSpacing: 0.2,
  },
  loginText: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', fontSize: 13,
  },
  loginLink: { color: '#fff', fontWeight: '700' },
});
