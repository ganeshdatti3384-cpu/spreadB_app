import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';

export default function AccountCreatedScreen({ route, navigation }) {
  const { role } = route.params || {};
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 55, friction: 6, useNativeDriver: true,
      }),
      Animated.spring(checkAnim, {
        toValue: 1, tension: 60, friction: 5, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ProfileSetupIntro', params: { role } }],
    });
  };

  return (
    <View style={styles.container}>
      {/* Animated card illustration */}
      <View style={styles.illustrationArea}>
        <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.cardLine} />
            <View style={[styles.cardLine, { width: 60 }]} />
          </View>

          {/* Green check badge */}
          <Animated.View
            style={[
              styles.checkBadge,
              {
                transform: [{
                  scale: checkAnim.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0, 1.2, 1],
                  }),
                }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={28} color={COLORS.primary} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Text */}
      <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Congratulations!</Text>
        <Text style={styles.subtitle}>
          Your account has been created successfully. Let's get you started!
        </Text>
      </Animated.View>

      <View style={{ flex: 1 }} />

      {/* Button */}
      <Animated.View style={[styles.btnWrap, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.btn} onPress={handleGetStarted} activeOpacity={0.85}>
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingBottom: 48,
  },

  // Illustration
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  cardWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    width: 128,
    height: 160,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    elevation: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardLine: {
    height: 8,
    width: 80,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    marginBottom: 6,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // Text
  textBlock: {
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Button
  btnWrap: { paddingHorizontal: 24 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
  },
  btnText: { color: COLORS.white, fontSize: SIZES.lg, fontWeight: '700' },
});
