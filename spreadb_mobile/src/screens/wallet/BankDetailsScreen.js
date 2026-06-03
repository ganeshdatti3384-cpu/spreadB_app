import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { getBankDetails, updateBankDetails, verifyBankOtp } from '../../api/wallet';

function FormInput({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

export default function BankDetailsScreen({ navigation }) {
  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branch: '',
  });
  const [accountType, setAccountType] = useState('savings');
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpVal, setOtpVal] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    loadBankDetails();
  }, []);

  const loadBankDetails = async () => {
    try {
      const res = await getBankDetails();
      if (res.data.bankDetails) {
        const bd = res.data.bankDetails;
        setExisting(bd);
        setForm({
          accountHolderName: bd.accountHolderName || '',
          accountNumber: bd.accountNumber || '',
          ifscCode: bd.ifscCode || '',
          bankName: bd.bankName || '',
          branch: bd.branch || '',
        });
        if (bd.accountType) setAccountType(bd.accountType);
      }
    } catch (e) {
      console.log('Bank details load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.accountHolderName || !form.accountNumber || !form.ifscCode || !form.bankName) {
      return Alert.alert('Error', 'Please fill all required fields');
    }
    setSaving(true);
    try {
      await updateBankDetails({ ...form, accountType });
      setOtpVal('');
      setShowOtpModal(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpVal || otpVal.length < 6) {
      return Alert.alert('Error', 'Please enter a valid 6-digit OTP');
    }
    setVerifyingOtp(true);
    try {
      await verifyBankOtp(otpVal);
      setShowOtpModal(false);
      Alert.alert('Success', 'Bank details verified successfully!', [
        { text: 'OK', onPress: () => {
          loadBankDetails();
        } },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Status */}
        {existing?.verified && (
          <View style={styles.verifiedBanner}>
            <View style={styles.verifiedIcon}>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedTitle}>Account Verified</Text>
              <Text style={styles.verifiedSubtext}>
                Your bank account is verified and ready for withdrawals
              </Text>
            </View>
          </View>
        )}

        {existing && !existing.verified && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.pendingText}>Verification pending (1–2 business days)</Text>
          </View>
        )}

        {/* Form */}
        <FormInput
          label="Account Holder Name"
          value={form.accountHolderName}
          onChangeText={(v) => update('accountHolderName', v)}
          placeholder="Full name as on bank account"
        />
        <FormInput
          label="Account Number"
          value={form.accountNumber}
          onChangeText={(v) => update('accountNumber', v)}
          placeholder="Enter account number"
          keyboardType="number-pad"
        />
        <FormInput
          label="IFSC Code"
          value={form.ifscCode}
          onChangeText={(v) => update('ifscCode', v.toUpperCase())}
          placeholder="e.g. HDFC0001234"
          autoCapitalize="characters"
        />
        <FormInput
          label="Bank Name"
          value={form.bankName}
          onChangeText={(v) => update('bankName', v)}
          placeholder="e.g. HDFC Bank"
        />
        <FormInput
          label="Branch"
          value={form.branch}
          onChangeText={(v) => update('branch', v)}
          placeholder="Branch name"
        />

        {/* Account Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account Type</Text>
          <View style={styles.accountTypeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, accountType === 'savings' && styles.typeBtnSelected]}
              onPress={() => setAccountType('savings')}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeBtnText, accountType === 'savings' && styles.typeBtnTextSelected]}>
                Savings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, accountType === 'current' && styles.typeBtnSelected]}
              onPress={() => setAccountType('current')}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeBtnText, accountType === 'current' && styles.typeBtnTextSelected]}>
                Current
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Bank account verification may take 1–2 business days. You will be notified once verified.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save Bank Details</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Verification OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowOtpModal(false)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Bank Details</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowOtpModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              A 6-digit verification code has been sent to your email. Please enter it below to verify your bank details.
            </Text>

            <View style={styles.otpInputWrap}>
              <TextInput
                style={styles.otpInput}
                value={otpVal}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9]/g, '');
                  setOtpVal(clean);
                }}
                maxLength={6}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, verifyingOtp && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={verifyingOtp}
              activeOpacity={0.85}
            >
              {verifyingOtp ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  verifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primaryLight || '#E6F7E6',
    borderRadius: SIZES.radius, padding: 14, marginBottom: 20,
  },
  verifiedIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  verifiedTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  verifiedSubtext: { fontSize: 12, color: COLORS.primary, opacity: 0.8, marginTop: 2 },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF8E1', borderRadius: SIZES.radius,
    padding: 12, marginBottom: 20,
  },
  pendingText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    paddingHorizontal: 14, height: 48, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputFocused: { borderColor: COLORS.primary },

  accountTypeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1, height: 48, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  typeBtnSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  typeBtnTextSelected: { color: COLORS.white },

  noteBox: {
    backgroundColor: COLORS.background, borderRadius: SIZES.radius,
    padding: 14, marginBottom: 24,
  },
  noteText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 50, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  // Modal Styles
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
  },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  modalSubmitText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  otpInputWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 20,
    width: 200,
    height: 56,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 4,
  },
});
