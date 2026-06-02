import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

function GoogleIcon() {
  return (
    <View style={googleIconStyles.container}>
      <Text style={[googleIconStyles.letter, { color: '#4285F4' }]}>G</Text>
      <Text style={[googleIconStyles.letter, { color: '#EA4335' }]}>o</Text>
      <Text style={[googleIconStyles.letter, { color: '#FBBC05' }]}>o</Text>
      <Text style={[googleIconStyles.letter, { color: '#4285F4' }]}>g</Text>
      <Text style={[googleIconStyles.letter, { color: '#34A853' }]}>l</Text>
      <Text style={[googleIconStyles.letter, { color: '#EA4335' }]}>e</Text>
    </View>
  );
}

const googleIconStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  letter: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, request } = useGoogleAuth({
    role: 'Influencer',
    onSuccess: () => {
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    },
    onError: (msg) => Alert.alert('Google Sign-In Failed', msg),
    onLoadingChange: setGoogleLoading,
  });

  const handleContinue = () => {
    const trimmed = email.trim();
    if (!trimmed) return Alert.alert('Error', 'Please enter your email address');
    if (!isValidEmail(trimmed)) return Alert.alert('Error', 'Please enter a valid email address');
    navigation.navigate('LoginPassword', { email: trimmed });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoInitials}>SB</Text>
          </View>
          <Text style={styles.logoText}>SpreadB</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>

        {/* Email field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrapper, focused && styles.inputFocused]}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={focused ? COLORS.primary : COLORS.textLight}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.primaryBtn, !isValidEmail(email) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!isValidEmail(email)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google sign-in */}
        <TouchableOpacity
          style={[styles.socialBtn, (googleLoading || !request) && styles.btnDisabled]}
          onPress={signIn}
          disabled={googleLoading || !request}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1, minHeight: 40 }} />

        {/* Footer */}
        <Text style={styles.bottomText}>
          {"Don't have an account? "}
          <Text style={styles.link} onPress={() => navigation.navigate('Welcome')}>
            Sign Up
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },

  // Heading
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },

  // Field
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    height: 52,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 14,
    color: COLORS.textLight,
    fontSize: 13,
  },

  // Social
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusLg,
    height: 52,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Footer
  bottomText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
