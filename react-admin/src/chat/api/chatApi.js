import axios from 'axios';

const api = axios.create({
  baseURL: '/api/chat',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get all chat rooms for current user
 */
export const getChatRooms = async (search = '') => {
  const params = search ? { search } : {};
  const response = await api.get('/rooms', { params });
  return response.data;
};

/**
 * Get messages for a specific room
 */
export const getMessages = async (storeId, buyerId, limit = 50, before = null) => {
  const params = { limit };
  if (before) params.before = before;
  
  const response = await api.get(`/rooms/${storeId}/${buyerId}/messages`, { params });
  return response.data;
};

/**
 * Send a new message
 */
export const sendMessage = async (storeId, buyerId, messageType, content, productId = null) => {
  try {
    const response = await api.post(`/rooms/${storeId}/${buyerId}/messages`, {
      message_type: messageType,
      content: content,
      product_id: productId
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.error) {
      throw { 
        feature_disabled: true, 
        message: error.response.data.error,
        redirect_url: error.response.data.redirect_url
      };
    }
    throw error;
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (storeId, buyerId) => {
  const response = await api.put(`/rooms/${storeId}/${buyerId}/read`);
  return response.data;
};

/**
 * Get list of stores (for buyer to start new chat)
 */
export const getStores = async (search = '') => {
  const params = search ? { search } : {};
  const response = await api.get('/stores', { params });
  return response.data;
};

/**
 * Create new chat room
 */
export const createChatRoom = async (storeId) => {
  const response = await api.post('/rooms', { storeId });
  return response.data;
};

/**
 * Upload image
 */
export const uploadImage = async (file, storeId, buyerId) => {
  const formData = new FormData();
  formData.append('image', file);
  
  if (storeId) formData.append('store_id', storeId);
  if (buyerId) formData.append('buyer_id', buyerId);

  const response = await api.post('/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export default api;
