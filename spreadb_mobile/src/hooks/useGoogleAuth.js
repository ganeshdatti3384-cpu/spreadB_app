import { useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { googleMobileAuth } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';

// Required — completes the auth session when browser redirects back
WebBrowser.maybeCompleteAuthSession();

// Your Google OAuth client ID (Expo/Android client ID)
const EXPO_CLIENT_ID    = '1054695962999-eekm957bjg24qsq18dnhj63lcltq1jhb.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '1054695962999-eekm957bjg24qsq18dnhj63lcltq1jhb.apps.googleusercontent.com';
const IOS_CLIENT_ID     = '1054695962999-eekm957bjg24qsq18dnhj63lcltq1jhb.apps.googleusercontent.com';

export const useGoogleAuth = ({ role, onSuccess, onError, onLoadingChange }) => {
  const { saveAuth } = useAuth();

  // SDK 51 — Google.useAuthRequest replaces the old useProxy approach
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:        EXPO_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId:     IOS_CLIENT_ID,
    scopes:          ['openid', 'profile', 'email'],
  });

  const handleGoogleResponse = useCallback(async (authentication) => {
    onLoadingChange?.(true);
    try {
      const accessToken = authentication?.accessToken || authentication?.access_token;
      if (!accessToken) throw new Error('No access token received from Google');

      // Fetch user info from Google
      const userInfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!userInfoRes.ok) throw new Error('Failed to fetch user info from Google');

      const userInfo = await userInfoRes.json();
      if (!userInfo.email) throw new Error('Could not get email from Google account');

      // Send to backend
      const res = await googleMobileAuth({
        email:     userInfo.email,
        googleId:  userInfo.sub,
        firstName: userInfo.given_name  || userInfo.name?.split(' ')[0] || '',
        lastName:  userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
        role:      role || 'Influencer',
      });

      const { token, userId, email, role: userRole } = res.data;
      await saveAuth(token, { _id: userId, email, role: userRole });
      onSuccess?.(res.data);

    } catch (err) {
      console.error('Google auth error:', err);
      const msg = err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.';
      onError?.(msg);
    } finally {
      onLoadingChange?.(false);
    }
  }, [role, saveAuth, onSuccess, onError, onLoadingChange]);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      handleGoogleResponse(response.params || response.authentication);
    } else if (response.type === 'error') {
      onError?.(response.error?.message || 'Google sign-in failed.');
      onLoadingChange?.(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      // User closed browser — not an error
      onLoadingChange?.(false);
    }
  }, [response]);

  const signIn = useCallback(async () => {
    if (!request) {
      Alert.alert('Not Ready', 'Google sign-in is still loading. Please try again in a moment.');
      return;
    }
    try {
      onLoadingChange?.(true);
      await promptAsync();   // SDK 51 — no useProxy
    } catch (err) {
      console.error('promptAsync error:', err);
      onError?.('Failed to open Google sign-in. Please try again.');
      onLoadingChange?.(false);
    }
  }, [request, promptAsync, onError, onLoadingChange]);

  return { signIn, request };
};
