// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gtymalltestbe.onrender.com',
  withCredentials: true, // เพิ่มบรรทัดนี้ เพื่ออนุญาตให้ส่ง HttpOnly Cookie และยืนยันตัวตน
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Wallet & User Orders API
export const getUserWallet = () => api.get('/api/users/me/wallet');
export const getMyOrders = () => api.get('/api/orders');

// Admin Orders API
export const adminGetAllOrders = () => api.get('/api/admin/orders');
export const adminUpdateOrderStatus = (id: number, status: string) => 
  api.put(`/api/admin/orders/${id}/status`, { status });

// Admin Wallet API (สำหรับแอดมินเติมเงินให้ User)
export const adminUpdateUserWallet = (userId: string, balance: number) => 
  api.put(`/api/admin/users/${userId}/wallet`, { balance });
export const commentApi = {
  getComments: (productId: number) => 
    api.get(`/products/${productId}/comments`),
  
  createComment: (productId: number, data: { order_id: number, rating: number, message: string }) => 
    api.post(`/products/${productId}/comments`, data),
  
  updateComment: (productId: number, commentId: number, data: { rating: number, message: string }) => 
    api.patch(`/products/${productId}/comments/${commentId}`, data),
  
  deleteComment: (productId: number, commentId: number) => 
    api.delete(`/products/${productId}/comments/${commentId}`),
};