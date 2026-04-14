// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gtymalltestbe.onrender.com', 
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
export const getMyOrders = () => api.get('/api/orders/me');

// Admin Orders API
export const adminGetAllOrders = () => api.get('/api/admin/orders');
export const adminUpdateOrderStatus = (id: number, status: string) => 
  api.put(`/api/admin/orders/${id}/status`, { status });

// Admin Wallet API (สำหรับแอดมินเติมเงินให้ User)
export const adminUpdateUserWallet = (userId: string, balance: number) => 
  api.put(`/api/admin/users/${userId}/wallet`, { balance });

