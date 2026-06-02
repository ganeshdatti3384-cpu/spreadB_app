import api from './config';

export const createInfluencerProfile = (formData) =>
  api.post('/api/profile/influencer', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const createBrandProfile = (formData) =>
  api.post('/api/profile/brand', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getInfluencerProfile = () => api.get('/api/profile/influencer');
export const getBrandProfile = () => api.get('/api/profile/brand');

export const updateInfluencerProfile = (formData) =>
  api.put('/api/profile/influencer', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateBrandProfile = (formData) =>
  api.put('/api/profile/brand', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getInfluencers = () => api.get('/api/profile/influencers');
export const getInfluencerById = (id) => api.get(`/api/profile/influencer/${id}`);
