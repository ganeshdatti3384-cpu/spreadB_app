import api from './config';

// Backend: POST /api/promotion/create
export const createPromotion = (data) => api.post('/api/promotion/create', data);

// Backend: GET /api/promotion/browse
export const browsePromotions = () => api.get('/api/promotion/browse');

// Backend: GET /api/promotion/search
export const searchPromotions = (params) => api.get('/api/promotion/search', { params });

// Backend: GET /api/promotion/filters
export const getPromotionFilters = () => api.get('/api/promotion/filters');

// Backend: GET /api/promotion/:id
export const getPromotionById = (id) => api.get(`/api/promotion/${id}`);

// Backend: PUT /api/promotion/:id
export const updatePromotion = (id, data) => api.put(`/api/promotion/${id}`, data);

// Backend: DELETE /api/promotion/:id
export const deletePromotion = (id) => api.delete(`/api/promotion/${id}`);

// Backend: GET /api/promotion/my-promotions
export const getMyPromotions = () => api.get('/api/promotion/my-promotions');

// Backend: GET /api/promotion/proposals
export const getProposals = () => api.get('/api/promotion/proposals');

// Backend: GET /api/promotion/active-collaborations
export const getActiveCollaborations = () => api.get('/api/promotion/active-collaborations');

// Backend: GET /api/promotion/completed-campaigns
export const getCompletedCampaigns = () => api.get('/api/promotion/completed-campaigns');

// Backend: GET /api/promotion/campaign/:campaignId/applicants
export const getCampaignApplicants = (id) =>
  api.get(`/api/promotion/campaign/${id}/applicants`);
