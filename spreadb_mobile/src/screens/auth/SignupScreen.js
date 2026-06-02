import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { signup } from '../../api/auth';

// Password Requirements Component
const getPasswordRequirements = (password) => [
  { label: '8+ chars', met: password.length >= 8 },
  { label: 'Uppercase', met: /[A-Z]/.test(password) },
  { label: 'Number', met: /[0-9]/.test(password) },
  { label: 'Special', met: /[!@#$%^&*]/.test(password) },
];

function PasswordStrength({ password }) {
  if (!password) return null;
  const reqs = getPasswordRequirements(password);
  const metCount = reqs.filter(r => r.met).length;
  
  return (
    <View style={pwStyles.container}>
      <View style={pwStyles.bars}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              pwStyles.bar,
              i < metCount && pwStyles.barActive,
              metCount === 4 && pwStyles.barFull
            ]}
          />
        ))}
      </View>
      <View style={pwStyles.reqs}>
        {reqs.map((r) => (
          <View key={r.label} style={pwStyles.req}>
            <Ionicons
              name={r.met ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={r.met ? COLORS.primary : COLORS.textLight}
            />
            <Text style={[pwStyles.reqText, r.met && pwStyles.reqMet]}>{r.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const pwStyles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 4 },
  bars: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  bar: { flex: 1, height: 3, backgroundColor: COLORS.borderLight, borderRadius: 2 },
  barActive: { backgroundColor: COLORS.warning },
  barFull: { backgroundColor: COLORS.primary },
  reqs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  req: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reqText: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  reqMet: { color: COLORS.primary, fontWeight: '600' },
});

export default function SignupScreen({ route, navigation }) {
  const preselectedRole = route.params?.role || 'Influencer';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState(preselectedRole);
  const [loading, setLoading] = useState(false);

  const reqs = getPasswordRequirements(password);
  const allReqsMet = reqs.every((r) => r.met);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && allReqsMet && passwordsMatch;

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      await signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword: password,
        role,
      });
      navigation.navigate('OtpVerify', {
        email: email.trim().toLowerCase(),
        isLogin: false,
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed. Please try again.';
      Alert.alert('Signup Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#0A2010', '#0D3015', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join as {role}</Text>
        </View>
      </LinearGradient>

      {/* Form Content */}
      <View style={styles.content}>
        {/* Name Row */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John"
              placeholderTextColor={COLORS.placeholder}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Doe"
              placeholderTextColor={COLORS.placeholder}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="john@example.com"
              placeholderTextColor={COLORS.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Create password"
              placeholderTextColor={COLORS.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {password.length > 0 && <PasswordStrength password={password} />}

        {/* Confirm Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Confirm password"
              placeholderTextColor={COLORS.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Ionicons
                name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.errorText}>Passwords don't match</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isFormValid || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isFormValid && !loading ? ['#0A2010', '#0D3015', '#0A1628'] : ['#9CA3AF', '#9CA3AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.submitText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
              Sign In
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerContent: { alignItems: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SIZES.shadow.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },

  // Form
  row: { flexDirection: 'row', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  inputIcon: { marginRight: 10 },
  inputWithIcon: { flex: 1, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4, marginLeft: 8 },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },

  // Submit
  submitBtn: {
    height: 54,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginTop: 8,
    ...SIZES.shadow.md,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
