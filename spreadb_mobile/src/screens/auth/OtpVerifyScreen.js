import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { verifyOtp, resendOtp } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function OtpVerifyScreen({ route, navigation }) {
  const { email, isLogin } = route.params;
  const { saveAuth } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    inputs.current[0]?.focus();
    
    // Try to auto-read OTP from clipboard multiple times
    checkClipboardForOTP();
    
    // Set up periodic clipboard checks for 30 seconds
    const clipboardInterval = setInterval(() => {
      checkClipboardForOTP();
    }, 2000);
    
    setTimeout(() => clearInterval(clipboardInterval), 30000);
    
    return () => clearInterval(clipboardInterval);
  }, []);

  const checkClipboardForOTP = async () => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { default: Clipboard } = await import('@react-native-clipboard/clipboard');
        
        const clipboardContent = await Clipboard.getString();
        
        // Look for 6-digit OTP in various formats
        const otpPatterns = [
          /\b(\d{6})\b/,                    // Simple 6 digits
          /code[:\s]+(\d{6})/i,             // "code: 123456"
          /otp[:\s]+(\d{6})/i,              // "OTP: 123456"
          /verification[:\s]+(\d{6})/i,     // "verification: 123456"
          /verify[:\s]+(\d{6})/i,           // "verify: 123456"
          /(\d{6})[^\d]/,                   // 6 digits followed by non-digit
          /is[:\s]+(\d{6})/i,               // "is: 123456"
        ];
        
        for (const pattern of otpPatterns) {
          const match = clipboardContent.match(pattern);
          if (match && match[1]) {
            const otpDigits = match[1].split('');
            // Only set if OTP is not already filled
            if (otp.join('').length < 6) {
              setOtp(otpDigits);
              // Auto-verify after a short delay
              setTimeout(() => {
                const code = otpDigits.join('');
                if (code.length === 6) {
                  handleVerify();
                }
              }, 800);
            }
            return;
          }
        }
      }
    } catch (error) {
      console.log('Clipboard check skipped:', error.message);
    }
  };

  const handleChange = (val, idx) => {
    const newOtp = [...otp];
    newOtp[idx] = val.replace(/[^0-9]/g, '');
    setOtp(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) return Alert.alert('Error', 'Please enter the complete 6-digit code');
    setLoading(true);
    try {
      const res = await verifyOtp({ email, otp: code });
      const { token, userId, role, user: userData } = res.data;
      // Prefer the full user object from the server; fall back to minimal shape
      const userToSave = userData || { _id: userId, email, role };
      await saveAuth(token, userToSave);

      if (isLogin) {
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'AccountCreated', params: { role } }] });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      Alert.alert('Verification Failed', msg);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOtp({ email });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const isComplete = otp.every(d => d !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Mail icon */}
        <View style={styles.iconWrapper}>
          <Ionicons name="mail-unread-outline" size={40} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          {"We've sent a 6-digit code to"}
        </Text>
        <Text style={styles.email}>{email}</Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(r) => (inputs.current[idx] = r)}
              style={[
                styles.otpBox,
                digit && styles.otpBoxFilled,
                loading && styles.otpBoxDisabled,
              ]}
              value={digit}
              onChangeText={(v) => handleChange(v, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              editable={!loading}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.primaryBtn, (!isComplete || loading) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={!isComplete || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendContainer}>
          {resending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : countdown > 0 ? (
            <Text style={styles.resendCountdown}>
              Resend code in <Text style={styles.resendCountdownBold}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
              <Text style={styles.resendLink}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.spamNote}>Can't find it? Check your spam folder</Text>
        
        {/* Paste OTP hint */}
        <TouchableOpacity 
          style={styles.pasteHint}
          onPress={checkClipboardForOTP}
          activeOpacity={0.7}
        >
          <Ionicons name="clipboard-outline" size={16} color={COLORS.primary} />
          <Text style={styles.pasteHintText}>Tap to paste OTP from clipboard</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  backBtn: {
    marginTop: 52,
    marginLeft: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },

  iconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 24, fontWeight: '700', color: COLORS.dark,
    marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: 4,
  },
  email: {
    fontSize: 14, fontWeight: '700', color: COLORS.dark,
    textAlign: 'center', marginBottom: 32,
  },

  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', marginBottom: 28,
  },
  otpBox: {
    width: 48, height: 56,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    fontSize: 22, fontWeight: '700', color: COLORS.dark,
    backgroundColor: COLORS.background,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  otpBoxDisabled: { opacity: 0.6 },

  primaryBtn: {
    width: '100%', height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resendContainer: { alignItems: 'center', paddingVertical: 8 },
  resendCountdown: { fontSize: 14, color: COLORS.textSecondary },
  resendCountdownBold: { fontWeight: '700', color: COLORS.dark },
  resendLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  spamNote: {
    fontSize: 12, color: COLORS.textLight,
    textAlign: 'center', marginTop: 24,
  },
  
  pasteHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 10,
  },
  pasteHintText: {
    fontSize: 13, color: COLORS.primary, fontWeight: '600',
  },
});
