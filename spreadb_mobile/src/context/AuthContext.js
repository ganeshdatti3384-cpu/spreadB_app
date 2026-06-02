import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../api/auth';
import { setLogoutCallback, setCachedToken, clearCachedToken } from '../api/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  const logoutRef = useRef(null);

  const logout = async () => {
    clearCachedToken();
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  logoutRef.current = logout;

  useEffect(() => {
    setLogoutCallback(() => logoutRef.current?.());
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser  = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        // Warm the in-memory cache immediately so the first API call is fast
        setCachedToken(storedToken);
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Background refresh — don't block the UI
        // If the token is expired the 401 interceptor will call logout()
        getMe()
          .then((res) => {
            // getMe returns { user, _id, firstName, ... } — handle both shapes
            const freshUser = res.data?.user || res.data;
            if (freshUser && (freshUser._id || freshUser.email)) {
              AsyncStorage.setItem('user', JSON.stringify(freshUser));
              setUser(freshUser);
            }
          })
          .catch((e) => {
            // 401 is handled by the interceptor (auto-logout)
            // Other errors (network offline) — keep cached user
            console.log('Background token check:', e?.response?.status ?? e?.message);
          });
      }
    } catch (e) {
      console.log('Auth load error:', e);
    } finally {
      // Mark loading done immediately — don't wait for getMe
      setLoading(false);
    }
  };

  const saveAuth = async (tokenValue, userData) => {
    setCachedToken(tokenValue);
    await AsyncStorage.setItem('token', tokenValue);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      const updated = res.data?.user || res.data;
      if (updated && updated._id) {
        await AsyncStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
      }
    } catch (e) {
      console.log('Refresh user error:', e?.response?.status ?? e?.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, saveAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
