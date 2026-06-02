import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, StatusBar, Easing, Image,
} from 'react-native';
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
  const floatAnim = useRef(new Animated.Value(0)).current;
  const move1 = useRef(new Animated.Value(0)).current;
  const move2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating sequence (5 seconds loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ambient loop
    const animate = (anim, duration, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1, duration,
            easing: Easing.bezier(0.445, 0.05, 0.55, 0.95), useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0, duration,
            easing: Easing.bezier(0.445, 0.05, 0.55, 0.95), useNativeDriver: true,
          }),
        ])
      );

    animate(move1, 4500).start();
    animate(move2, 6000, 1000).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const scale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  const rotate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-0.8deg', '0.8deg'],
  });

  const isBrand = role === 'brand';

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark base */}
      <View style={[styles.bgBase, { backgroundColor: isBrand ? '#090D16' : '#070A0E' }]} />

      {/* Ambient background glows */}
      <Animated.View
        style={[
          styles.lightBlob1,
          {
            backgroundColor: isBrand ? '#1F57C3' : COLORS.primary,
            opacity: move1.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.22] }),
            transform: [{ scale: move1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.lightBlob2,
          {
            backgroundColor: isBrand ? COLORS.primary : '#8B5CF6',
            opacity: move2.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.2] }),
          },
        ]}
      />

      {/* Centered Collaboration Illustration */}
      <View style={styles.illustrationContainer}>
        <Animated.View
          style={[
            styles.illustrationWrapper,
            {
              transform: [{ translateY }, { scale }, { rotate }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/collaboration.png')}
            style={styles.illustrationImage}
            resizeMode="cover"
          />
        </Animated.View>
      </View>
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
  illustrationContainer: {
    position: 'absolute',
    top: height * 0.15,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) / 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
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
