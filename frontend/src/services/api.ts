// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gtymalltestbe.onrender.com',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ==========================================
// User & Wallet API
// ==========================================
export const getUserWallet = () => api.get('/api/users/me/wallet');
export const getUserAddresses = () => api.get('/api/users/addresses');
export const addUserAddress = (data: { title: string, address: string }) => api.post('/api/users/addresses', data);

// ==========================================
// Orders & Shipments API
// ==========================================
export const getMyOrders = () => api.get('/api/orders');

export const shipmentApi = {
  updateStatus: (data: {
    shipment_id: number;
    status: string;
    center_id?: number;
    rider_id?: number;
    tracking_detail: string;
    location: string;
  }) => api.put('/api/orders/shipments/status', data),
};

// ==========================================
// Admin API
// ==========================================
export const adminGetAllOrders = () => api.get('/api/admin/orders');
export const adminUpdateOrderStatus = (id: number, status: string) => 
  api.put(`/api/admin/orders/${id}/status`, { status });
export const adminUpdateUserWallet = (userId: string, balance: number) => 
  api.put(`/api/admin/users/${userId}/wallet`, { balance });

// ==========================================
// Product Comments API
// ==========================================
export const commentApi = {
  getComments: (productId: number) => 
    api.get(`/api/products/${productId}/comments`),
  
  createComment: (productId: number, data: { order_id: number, rating: number, message: string }) => 
    api.post(`/api/products/${productId}/comments`, data),
  
  updateComment: (productId: number, commentId: number, data: { rating: number, message: string }) => 
    api.patch(`/api/products/${productId}/comments/${commentId}`, data),
  
  deleteComment: (productId: number, commentId: number) => 
    api.delete(`/api/products/${productId}/comments/${commentId}`),
};