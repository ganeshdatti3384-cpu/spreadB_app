import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import Button from '../../components/common/Button';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;

const OtpVerifyScreen = ({ navigation, route }) => {
  const { email, mode, role } = route.params || {};
  const { saveAuth } = useAuth();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (val, index) => {
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp({ email, otp: code });
      const { token, userId, role: userRole } = res.data;
      await saveAuth(token, { userId, email }, userRole || role || 'Influencer');

      if (mode === 'signup') {
        navigation.replace('AccountCreated', { role: userRole || role });
      } else {
        navigation.replace('Main');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await authAPI.resendOtp({ email });
      setResendTimer(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
    } catch (err) {
      setError('Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
        </View>

        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.subheading}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        {/* OTP inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={(val) => handleChange(val.slice(-1), index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          size="lg"
          style={{ marginTop: SPACING.xl }}
        />

        <TouchableOpacity style={styles.resendRow} onPress={handleResend}>
          <Text style={styles.resendText}>
            Didn't receive the code?{' '}
            <Text style={[styles.resendLink, resendTimer > 0 && styles.resendDisabled]}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  back: { marginBottom: SPACING.xxxl },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    alignSelf: 'center',
  },
  heading: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxxl,
  },
  email: { fontWeight: '600', color: COLORS.text },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  resendRow: { alignItems: 'center', marginTop: SPACING.xl },
  resendText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  resendLink: { color: COLORS.primary, fontWeight: '600' },
  resendDisabled: { color: COLORS.textLight },
});

export default OtpVerifyScreen;
