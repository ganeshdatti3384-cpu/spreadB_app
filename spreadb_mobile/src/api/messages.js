import api from './config';

// Backend: GET /api/messages/conversations
export const getConversations = () => api.get('/api/messages/conversations');

// Backend: GET /api/messages/conversations/:conversationId
export const getMessages = (conversationId) =>
  api.get(`/api/messages/conversations/${conversationId}`);

// Backend: POST /api/messages/send
export const sendMessage = (data) => api.post('/api/messages/send', data);

// Backend: POST /api/messages/send (with file)
export const sendFileMessage = (formData) =>
  api.post('/api/messages/send', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Backend: PUT /api/messages/:messageId
export const editMessage = (messageId, data) =>
  api.put(`/api/messages/${messageId}`, data);

// Backend: DELETE /api/messages/:messageId
export const deleteMessage = (messageId) =>
  api.delete(`/api/messages/${messageId}`);
