import api from './config';

export const submitProof = (formData) =>
  api.post('/api/submissions/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMySubmissions = () => api.get('/api/submissions/my');
export const getSubmissionsForCampaign = (campaignId) =>
  api.get(`/api/submissions/campaign/${campaignId}`);
export const reviewSubmission = (data) => api.patch('/api/submissions/review', data);
