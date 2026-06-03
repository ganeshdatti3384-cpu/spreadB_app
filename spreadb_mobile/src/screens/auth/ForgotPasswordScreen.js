import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { forgotPassword, verifyForgotOtp, resetPassword } from '../../api/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValidOtp = otp.trim().length === 6;
  const isValidPassword = password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword;

  const handleSendOtp = async () => {
    if (!isValidEmail) return Alert.alert('Error', 'Please enter a valid email address');
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      Alert.alert('OTP Sent', 'A verification OTP has been sent to your email.');
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isValidOtp) return Alert.alert('Error', 'Please enter a valid 6-digit code');
    setLoading(true);
    try {
      const res = await verifyForgotOtp({ email: email.trim(), otp: otp.trim() });
      if (res.data?.token) {
        setToken(res.data.token);
        setStep(3);
      } else {
        Alert.alert('Error', 'Failed to retrieve verification token');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters long');
    
    // Validate password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
      );
    }

    setLoading(true);
    try {
      await resetPassword({ token, password, confirmPassword });
      Alert.alert('Success', 'Your password has been successfully reset.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password. Please request a new OTP.');
      setStep(1);
      setOtp('');
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigation.goBack();
            }
          }} 
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        {/* Lock Icon */}
        <View style={styles.iconWrap}>
          <Ionicons 
            name={step === 1 ? "lock-closed-outline" : step === 2 ? "key-outline" : "shield-checkmark-outline"} 
            size={32} 
            color={COLORS.primary} 
          />
        </View>

        {step === 1 && (
          <>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              {"Enter your registered email address and we'll send you a 6-digit OTP code to verify your identity."}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? COLORS.primary : COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="send"
                  onSubmitEditing={handleSendOtp}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!isValidEmail || loading) && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={!isValidEmail || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Enter OTP Code</Text>
            <Text style={styles.subtitle}>
              {`We've sent a 6-digit verification code to ${email}. Enter the code below.`}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>OTP Code</Text>
              <View style={[styles.inputWrapper, focusedField === 'otp' && styles.inputFocused]}>
                <Ionicons
                  name="keypad-outline"
                  size={18}
                  color={focusedField === 'otp' ? COLORS.primary : COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit verification code"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField('')}
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!isValidOtp || loading) && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={!isValidOtp || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify OTP Code</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.resendBtnText}>Resend OTP Code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {"Choose a strong, secure new password for your account."}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? COLORS.primary : COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={[styles.inputWrapper, focusedField === 'confirmPassword' && styles.inputFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'confirmPassword' ? COLORS.primary : COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!isValidPassword || loading) && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={!isValidPassword || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },

  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },

  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },

  title: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 32 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: 14,
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 52, fontSize: 15, color: COLORS.text },

  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 52, alignItems: 'center', justifyContent: 'center',
    elevation: 3,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  resendBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
