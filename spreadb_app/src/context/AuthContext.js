import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null); // 'Influencer' | 'Brand Owner' | 'Admin'
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser, storedRole, storedHasProfile] = await AsyncStorage.multiGet([
        'token', 'user', 'role', 'hasProfile',
      ]);
      if (storedToken[1]) {
        setToken(storedToken[1]);
        setUser(storedUser[1] ? JSON.parse(storedUser[1]) : null);
        setRole(storedRole[1]);
        setHasProfile(storedHasProfile[1] === 'true');
      }
    } catch (e) {
      console.error('loadStoredAuth error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveAuth = async (tokenVal, userVal, roleVal) => {
    await AsyncStorage.multiSet([
      ['token', tokenVal],
      ['user', JSON.stringify(userVal)],
      ['role', roleVal],
    ]);
    setToken(tokenVal);
    setUser(userVal);
    setRole(roleVal);
  };

  const setProfileCreated = async () => {
    await AsyncStorage.setItem('hasProfile', 'true');
    setHasProfile(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user', 'role', 'hasProfile']);
    setToken(null);
    setUser(null);
    setRole(null);
    setHasProfile(false);
  };

  const isInfluencer = role === 'Influencer';
  const isBrandOwner = role === 'Brand Owner';
  const isAdmin = role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        hasProfile,
        isInfluencer,
        isBrandOwner,
        isAdmin,
        saveAuth,
        setProfileCreated,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
