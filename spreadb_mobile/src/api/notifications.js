import api from './config';

// Backend: GET /api/notifications/all
export const getNotifications = () => api.get('/api/notifications/all');

// Backend: PATCH /api/notifications/:id/read
export const markAsRead = (id) => api.patch(`/api/notifications/${id}/read`);

// Backend: PATCH /api/notifications/read-all
export const markAllRead = () => api.patch('/api/notifications/read-all');

// Backend: GET /api/counting/counts
export const getCounts = () => api.get('/api/counting/counts');
