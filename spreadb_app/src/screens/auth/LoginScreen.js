import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { authAPI } from '../../services/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setError('');
    // Navigate to password/OTP step
    navigation.navigate('LoginPassword', { email: email.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>SpreadB</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Username or email</Text>
          <Input
            placeholder="Username or Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
            leftIcon={
              <Ionicons name="person-outline" size={20} color={COLORS.gray400} />
            }
            style={{ marginBottom: SPACING.lg }}
          />

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            size="lg"
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-apple" size={20} color={COLORS.black} />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have a SpreadB account?{' '}
            <Text
              style={styles.signUpLink}
              onPress={() => navigation.navigate('Welcome')}
            >
              Sign Up
            </Text>
          </Text>
          <Text style={styles.disclaimer}>
            SpreadB uses cookies for analytics, personalized content, and ads.
            By using SpreadB's services, you agree to this use of cookies.{' '}
            <Text style={styles.learnMore}>Learn more</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: -1,
  },
  form: { flex: 1 },
  fieldLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '400',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: { marginTop: 'auto', paddingTop: SPACING.xxxl },
  footerText: {
    textAlign: 'center',
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  signUpLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  learnMore: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
