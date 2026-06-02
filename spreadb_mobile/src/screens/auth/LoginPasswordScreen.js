import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { login } from '../../api/auth';

export default function LoginPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) return Alert.alert('Error', 'Please enter your password');
    setLoading(true);
    try {
      await login({ email, password });
      navigation.navigate('OtpVerify', { email, isLogin: true });
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || 'Login failed. Please check your credentials and try again.';

      // If account is not verified, offer to go to OTP screen
      if (msg.toLowerCase().includes('verify your email')) {
        Alert.alert(
          'Email Not Verified',
          'Your account email is not verified. Would you like to verify it now?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Verify Now',
              onPress: () => navigation.navigate('OtpVerify', { email, isLogin: false }),
            },
          ]
        );
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Enter your password</Text>
        <Text style={styles.subtitle}>
          Signing in as <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focused ? COLORS.primary : COLORS.textLight}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.placeholder}
              secureTextEntry={!showPassword}
              autoFocus
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, (!password || loading) && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={!password || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Log In</Text>
          )}
        </TouchableOpacity>
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

  title: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },
  emailHighlight: { fontWeight: '600', color: COLORS.text },

  fieldGroup: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: 14,
  },
  inputWrapperFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 52, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4 },

  forgotWrap: { alignItems: 'flex-end', marginBottom: 24 },
  forgotText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 52, alignItems: 'center', justifyContent: 'center',
    elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
