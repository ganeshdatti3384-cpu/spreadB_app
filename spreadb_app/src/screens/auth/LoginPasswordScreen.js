import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { authAPI } from '../../services/api';

const LoginPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      // Backend sends OTP to email for verification
      navigation.navigate('OtpVerify', {
        email,
        mode: 'login',
        message: res.data?.message || 'OTP sent to your email',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
      >
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.logo}>SpreadB</Text>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>{email}</Text>

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={error}
        />

        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          title="Log In"
          onPress={handleLogin}
          loading={loading}
          size="lg"
          style={{ marginTop: SPACING.lg }}
        />
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
  back: { marginBottom: SPACING.xl },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
    letterSpacing: -1,
  },
  heading: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  forgotLink: { alignSelf: 'flex-end', marginTop: -SPACING.sm },
  forgotText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default LoginPasswordScreen;
