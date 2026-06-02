// OTP Auto-Read Utility
// This provides a simple interface for auto-reading OTP from SMS
// Note: Email OTP auto-read is not supported on mobile devices for security reasons
// Users will need to manually copy OTP from email

import { Platform } from 'react-native';
import * as SMS from 'expo-sms';

/**
 * Request SMS permissions (Android only)
 * iOS doesn't support SMS reading for security reasons
 */
export const requestSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }
  
  try {
    const isAvailable = await SMS.isAvailableAsync();
    return isAvailable;
  } catch (error) {
    console.log('SMS permission error:', error);
    return false;
  }
};

/**
 * Extract OTP from SMS message
 * Looks for 6-digit numbers in the message
 */
export const extractOTPFromMessage = (message) => {
  if (!message) return null;
  
  // Look for 6-digit OTP patterns
  const otpPatterns = [
    /\b(\d{6})\b/,  // 6 digits
    /OTP.*?(\d{6})/i,  // "OTP is 123456"
    /code.*?(\d{6})/i,  // "code is 123456"
    /verification.*?(\d{6})/i,  // "verification code 123456"
  ];
  
  for (const pattern of otpPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Note: Email OTP auto-read is NOT supported
 * This is a security feature - apps cannot read emails
 * Users must manually copy OTP from their email app
 */
export const canAutoReadEmailOTP = () => {
  return false; // Email reading is not supported on mobile for security
};

/**
 * Show instructions for manual OTP entry
 */
export const getOTPInstructions = () => {
  return {
    title: 'Check your email',
    message: 'We\'ve sent a 6-digit code to your email. Please check your inbox and enter the code below.',
    tip: 'Can\'t find it? Check your spam folder',
  };
};
