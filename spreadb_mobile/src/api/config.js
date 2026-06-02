import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Backend URL ──────────────────────────────────────────────────────────────
// 🔴 PRODUCTION  → 'https://spreadb.flyhii.in'
// 🟡 LOCAL DEV   → 'http://192.168.29.206:3001'  (your machine's LAN IP)
//
// Switch to LOCAL DEV when the production server is down or you're testing locally.
// The Expo app on your phone/emulator must be on the same Wi-Fi as your dev machine.
export const BASE_URL = 'http://192.168.1.66:3001';

// ─── In-memory token cache ────────────────────────────────────────────────────
// Avoids reading AsyncStorage on every single request (was adding 20-100ms lag)
let _cachedToken = null;

export const setCachedToken = (token) => { _cachedToken = token; };
export const clearCachedToken = () => { _cachedToken = null; };

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT — use in-memory cache first, fall back to AsyncStorage once on cold start
api.interceptors.request.use(async (config) => {
  let token = _cachedToken;
  if (!token) {
    // Only hits disk on the very first request after a cold start
    token = await AsyncStorage.getItem('token');
    if (token) _cachedToken = token;
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Global 401 handler ───────────────────────────────────────────────────────
let _logoutCallback = null;
export const setLogoutCallback = (fn) => { _logoutCallback = fn; };

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      clearCachedToken();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      if (_logoutCallback) _logoutCallback();
    }
    return Promise.reject(error);
  }
);

export default api;
