import api from './config';

// Backend: GET /api/wallet/balance
export const getWalletBalance = () => api.get('/api/wallet/balance');

// Backend: GET /api/wallet/transactions
export const getTransactions = (params) => api.get('/api/wallet/transactions', { params });

// Backend: POST /api/wallet/add-money
export const addMoney = (data) => api.post('/api/wallet/add-money', data);

// Backend: POST /api/wallet/withdraw
export const withdrawMoney = (data) => api.post('/api/wallet/withdraw', data);

// Backend: GET /api/wallet/bank-details
export const getBankDetails = () => api.get('/api/wallet/bank-details');

// Backend: POST /api/wallet/bank-details
export const updateBankDetails = (data) => api.post('/api/wallet/bank-details', data);

// Backend: GET /api/wallet/check-balance
export const checkBalance = (amount) =>
  api.get('/api/wallet/check-balance', { params: { amount } });
