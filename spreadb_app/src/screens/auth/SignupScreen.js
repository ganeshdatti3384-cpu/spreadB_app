import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, CheckBox,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { authAPI } from '../../services/api';

const SignupScreen = ({ navigation, route }) => {
  const { role = 'Influencer' } = route.params || {};
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role,
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    if (!form.password) e.password = 'Required';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!agreed) e.agreed = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authAPI.signup(form);
      navigation.navigate('OtpVerify', {
        email: form.email,
        mode: 'signup',
        message: res.data?.message || 'OTP sent to your email',
        role,
      });
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Signup failed. Please try again.' });
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
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.logo}>SpreadB</Text>
        <Text style={styles.heading}>
          Sign up to find {role === 'Influencer' ? 'campaigns you love' : 'talent you need'}
        </Text>

        {/* Google */}
        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Name row */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: SPACING.sm }}>
            <Input
              label="First name"
              placeholder="First name"
              value={form.firstName}
              onChangeText={(v) => update('firstName', v)}
              autoCapitalize="words"
              error={errors.firstName}
              style={{ marginBottom: 0 }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Input
              label="Last name"
              placeholder="Last name"
              value={form.lastName}
              onChangeText={(v) => update('lastName', v)}
              autoCapitalize="words"
              error={errors.lastName}
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <Input
          label="Email"
          placeholder="Email address"
          value={form.email}
          onChangeText={(v) => update('email', v)}
          keyboardType="email-address"
          error={errors.email}
        />

        <Input
          label="Password"
          placeholder="Password (8 or more characters)"
          value={form.password}
          onChangeText={(v) => update('password', v)}
          secureTextEntry
          error={errors.password}
        />

        <Input
          label="Confirm Password"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChangeText={(v) => update('confirmPassword', v)}
          secureTextEntry
          error={errors.confirmPassword}
        />

        {/* Role selector */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>I am a:</Text>
          <View style={styles.roleRow}>
            {['Influencer', 'Brand Owner'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                onPress={() => update('role', r)}
              >
                <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAgreed(!agreed)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
          </View>
          <Text style={styles.checkText}>
            Yes, I understand and agree to the{' '}
            <Text style={styles.link}>SpreadB Terms of Service</Text>, including the{' '}
            <Text style={styles.link}>User Agreement</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>
        {errors.agreed && <Text style={styles.errorText}>{errors.agreed}</Text>}

        {errors.general && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{errors.general}</Text>
          </View>
        )}

        <Button
          title="Create my account"
          onPress={handleSignup}
          loading={loading}
          size="lg"
          style={{ marginTop: SPACING.lg }}
        />

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.link}>Log In</Text>
          </Text>
        </TouchableOpacity>
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
    marginBottom: SPACING.md,
    letterSpacing: -1,
  },
  heading: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  googleG: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  googleText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  row: { flexDirection: 'row', marginBottom: SPACING.lg },
  roleContainer: { marginBottom: SPACING.lg },
  roleLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  roleRow: { flexDirection: 'row', gap: SPACING.md },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  roleChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  roleChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  link: { color: COLORS.primary, textDecorationLine: 'underline' },
  errorText: { fontSize: FONTS.sizes.xs, color: COLORS.error, marginBottom: SPACING.sm },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorBoxText: { color: COLORS.error, fontSize: FONTS.sizes.sm },
  loginLink: { alignItems: 'center', marginTop: SPACING.xl },
  loginText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
});

export default SignupScreen;
