import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, ImageBackground, StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import Button from '../../components/common/Button';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Find, collaborate,\n& get paid\nall in one place',
    subtitle: "I'm an Influencer",
    role: 'Influencer',
    bg: COLORS.gray800,
    emoji: '🎯',
    tagline: 'Discover brand campaigns that match your niche',
  },
  {
    id: '2',
    title: 'Find, manage,\n& pay talent,\nall in one place',
    subtitle: "I'm a Brand Owner",
    role: 'Brand Owner',
    bg: COLORS.gray900,
    emoji: '🚀',
    tagline: 'Connect with the right influencers for your brand',
  },
];

const WelcomeScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState('Influencer');
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleRoleSelect = (role, index) => {
    setSelectedRole(role);
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleCreateAccount = () => {
    navigation.navigate('Signup', { role: selectedRole });
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={currentSlide.bg} />

      {/* Background */}
      <View style={[styles.bgContainer, { backgroundColor: currentSlide.bg }]}>
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Emoji illustration */}
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{currentSlide.emoji}</Text>
        </View>
      </View>

      {/* Content overlay */}
      <View style={styles.overlay}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>SpreadB</Text>
        </View>

        {/* Main text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.tagline}>{currentSlide.tagline}</Text>
        </View>

        {/* Role toggle */}
        <View style={styles.roleToggle}>
          {SLIDES.map((slide, index) => (
            <TouchableOpacity
              key={slide.id}
              style={[
                styles.roleBtn,
                selectedRole === slide.role && styles.roleBtnActive,
              ]}
              onPress={() => handleRoleSelect(slide.role, index)}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  selectedRole === slide.role && styles.roleBtnTextActive,
                ]}
              >
                {slide.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <Button
            title="Create account"
            onPress={handleCreateAccount}
            size="lg"
          />
          <TouchableOpacity style={styles.loginLink} onPress={handleLogin}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkText}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(20, 164, 77, 0.15)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(20, 164, 77, 0.1)',
    bottom: 200,
    left: -60,
  },
  emojiContainer: {
    position: 'absolute',
    top: height * 0.15,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  emoji: { fontSize: 120 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 48,
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: SPACING.xl,
  },
  logo: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  textContainer: {
    marginBottom: SPACING.xxxl,
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 40,
    marginBottom: SPACING.md,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.xl,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: COLORS.white,
  },
  roleBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  roleBtnTextActive: {
    color: COLORS.gray900,
  },
  ctaContainer: { gap: SPACING.md },
  loginLink: { alignItems: 'center', paddingVertical: SPACING.sm },
  loginText: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  loginLinkText: {
    color: COLORS.white,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
