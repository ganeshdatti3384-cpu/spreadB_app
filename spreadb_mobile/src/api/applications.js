import api from './config';

// Backend: POST /api/campaigns/apply
export const applyForPromotion = (data) => api.post('/api/campaigns/apply', data);

// Backend: POST /api/campaigns/withdraw
export const withdrawApplication = (data) => api.post('/api/campaigns/withdraw', data);

// Backend: GET /api/campaigns/applications/my
export const getMyApplications = () => api.get('/api/campaigns/applications/my');

// Backend: GET /api/campaigns/sticks/balance  (returns availableSticks / freeSticks / purchasedSticks)
export const getSticksBalance = () => api.get('/api/campaigns/sticks/balance');

// Backend: GET /api/campaigns/sticks/history
export const getSticksHistory = () => api.get('/api/campaigns/sticks/history');

// Backend: PATCH /api/actions/review
export const reviewApplication = (data) => api.patch('/api/actions/review', data);

// Backend: GET /api/actions/agreements
export const getAgreements = () => api.get('/api/actions/agreements');

// Backend: POST /api/actions/sign-agreement
export const signAgreement = (agreementId) => api.post('/api/actions/sign-agreement', { agreementId });

// Backend: POST /api/messages/send  (start a direct conversation)
export const startConversation = (data) => api.post('/api/messages/send', data);
