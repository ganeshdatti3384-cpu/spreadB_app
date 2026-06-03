import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { changePassword } from '../../api/auth';

export default function ChangePasswordScreen({ navigation }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleShow = (key) => setShowPass(s => ({ ...s, [key]: !s[key] }));

  const isValid = form.currentPassword.trim() && 
                  form.newPassword.trim() && 
                  form.confirmPassword.trim() && 
                  form.newPassword === form.confirmPassword &&
                  form.newPassword.length >= 8;

  const handleSubmit = async () => {
    if (!isValid) return;
    
    // Strong password validation regex (same as backend)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPasswordRegex.test(form.newPassword)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    setLoading(true);
    try {
      await changePassword(form);
      Alert.alert('Success', 'Password updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Update Your Password</Text>
        <Text style={styles.subtitle}>
          Ensure your account stays secure by using a strong password with uppercase, lowercase, numbers, and symbols.
        </Text>

        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={form.currentPassword}
              onChangeText={(v) => update('currentPassword', v)}
              secureTextEntry={!showPass.current}
              placeholder="Enter current password"
              placeholderTextColor={COLORS.placeholder}
            />
            <TouchableOpacity onPress={() => toggleShow('current')} style={styles.eyeBtn}>
              <Ionicons name={showPass.current ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={form.newPassword}
              onChangeText={(v) => update('newPassword', v)}
              secureTextEntry={!showPass.new}
              placeholder="Minimum 8 characters"
              placeholderTextColor={COLORS.placeholder}
            />
            <TouchableOpacity onPress={() => toggleShow('new')} style={styles.eyeBtn}>
              <Ionicons name={showPass.new ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={(v) => update('confirmPassword', v)}
              secureTextEntry={!showPass.confirm}
              placeholder="Re-enter new password"
              placeholderTextColor={COLORS.placeholder}
            />
            <TouchableOpacity onPress={() => toggleShow('confirm')} style={styles.eyeBtn}>
              <Ionicons name={showPass.confirm ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {form.newPassword.length > 0 && form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword && (
          <Text style={styles.errorText}>New passwords do not match.</Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    backgroundColor: COLORS.white, paddingHorizontal: 14, height: 48,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.text },
  eyeBtn: { padding: 4 },
  errorText: { color: COLORS.error, fontSize: 12, fontWeight: '600', marginBottom: 16 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
