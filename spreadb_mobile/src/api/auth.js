import api from './config';

export const signup = (data) => api.post('/api/auth/signup', data);
export const verifyOtp = (data) => api.post('/api/auth/verify-otp', data);
export const resendOtp = (data) => api.post('/api/auth/resend-otp', data);
export const login = (data) => api.post('/api/auth/login', data);
export const getMe = () => api.get('/api/auth/me');
export const forgotPassword = (data) => api.post('/api/auth/forgot-password', data);
export const verifyForgotOtp = (data) => api.post('/api/auth/verify-forgot-otp', data);
export const resetPassword = (data) => api.post('/api/auth/reset-password', data);
export const refreshToken = (data) => api.post('/api/auth/refresh', data);

// Google OAuth for mobile — sends the Google user info to backend
export const googleMobileAuth = (data) => api.post('/api/auth/google-mobile', data);
export const changePassword = (data) => api.post('/api/auth/change-password', data);
