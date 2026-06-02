import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your local IP when testing on a physical device
// e.g., 'http://192.168.1.100:3001'
export const BASE_URL = 'http://10.0.2.2:3001'; // Android emulator
// export const BASE_URL = 'http://localhost:3001'; // iOS simulator

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user', 'role']);
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/api/auth/signup', data),
  verifyOtp: (data) => api.post('/api/auth/verify-otp', data),
  resendOtp: (data) => api.post('/api/auth/resend-otp', data),
  login: (data) => api.post('/api/auth/login', data),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  getMe: () => api.get('/api/auth/me'),
  refreshToken: () => api.post('/api/auth/refresh'),
};

// ─── Profile ─────────────────────────────────────────────────────────────────
export const profileAPI = {
  createInfluencer: (formData) =>
    api.post('/api/profile/add_influencer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createBrandOwner: (formData) =>
    api.post('/api/profile/add_brand-owner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getInfluencer: () => api.get('/api/profile/get_influencer'),
  getBrandOwner: () => api.get('/api/profile/brand-owner'),
  updateInfluencer: (formData) =>
    api.patch('/api/profile/influencer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateBrandOwner: (formData) =>
    api.patch('/api/profile/brand-owner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getInfluencers: (params) => api.get('/api/profile/brand/influencers', { params }),
  getInfluencerById: (id) => api.get(`/api/profile/influencer/${id}`),
  getInfluencerFilters: () => api.get('/api/profile/brand/influencers/filters'),
};

// ─── Promotions ───────────────────────────────────────────────────────────────
export const promotionAPI = {
  browse: (params) => api.get('/api/promotion/browse', { params }),
  search: (params) => api.get('/api/promotion/search', { params }),
  getFilters: () => api.get('/api/promotion/filters'),
  getMyPromotions: () => api.get('/api/promotion/my-promotions'),
  getById: (id) => api.get(`/api/promotion/${id}`),
  create: (formData) =>
    api.post('/api/promotion/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, data) => api.put(`/api/promotion/${id}`, data),
  delete: (id) => api.delete(`/api/promotion/${id}`),
  getApplicants: (campaignId) => api.get(`/api/promotion/campaign/${campaignId}/applicants`),
  getProposals: () => api.get('/api/promotion/proposals'),
  getActiveCollaborations: () => api.get('/api/promotion/active-collaborations'),
  getCompletedCampaigns: () => api.get('/api/promotion/completed-campaigns'),
};

// ─── Applications ─────────────────────────────────────────────────────────────
export const applicationAPI = {
  apply: (data) => api.post('/api/campaigns/apply', data),
  withdraw: (data) => api.post('/api/campaigns/withdraw', data),
  getMyApplications: () => api.get('/api/campaigns/applications/my'),
  review: (data) => api.patch('/api/actions/review', data),
  getAgreements: () => api.get('/api/actions/agreements'),
  signAgreement: (data) => api.patch('/api/actions/agreement/sign', data),
};

// ─── Sticks ───────────────────────────────────────────────────────────────────
export const sticksAPI = {
  getBalance: () => api.get('/api/sticks/balance'),
  spend: (data) => api.post('/api/sticks/spend', data),
  getTransactions: () => api.get('/api/sticks/transactions'),
  getPricing: () => api.get('/api/sticks/pricing'),
  createOrder: (data) => api.post('/api/sticks/create-order', data),
  verifyPayment: (data) => api.post('/api/sticks/verify-payment', data),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletAPI = {
  getBalance: () => api.get('/api/wallet/balance'),
  getTransactions: () => api.get('/api/wallet/transactions'),
  addMoney: (data) => api.post('/api/wallet/add-money', data),
  withdraw: (data) => api.post('/api/wallet/withdraw', data),
  getBankDetails: () => api.get('/api/wallet/bank-details'),
  updateBankDetails: (data) => api.post('/api/wallet/bank-details', data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/api/notifications/all'),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
  getCounts: () => api.get('/api/counting/counts'),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messageAPI = {
  getConversations: () => api.get('/api/messages/conversations'),
  getMessages: (conversationId) => api.get(`/api/messages/conversations/${conversationId}`),
  sendMessage: (formData) =>
    api.post('/api/messages/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getUsers: () => api.get('/api/messages/users'),
  markRead: (conversationId) => api.put(`/api/messages/conversations/${conversationId}/read`),
  deleteMessage: (messageId) => api.delete(`/api/messages/${messageId}`),
};

// ─── Submissions ──────────────────────────────────────────────────────────────
export const submissionAPI = {
  submit: (formData) =>
    api.post('/api/submissions/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  review: (data) => api.post('/api/submissions/review', data),
  getMy: () => api.get('/api/submissions/my'),
  getBrandPending: () => api.get('/api/submissions/brand/pending'),
  getCampaignSubmissions: (campaignId) => api.get(`/api/submissions/campaign/${campaignId}`),
};
