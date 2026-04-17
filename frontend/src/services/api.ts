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
    shipment_id: string;
    status: string;
    center_id?: string;
    rider_id?: string;
    tracking_detail: string;
    location: string;
  }) => api.put('/api/orders/shipments/status', data),
};

// ==========================================
// Admin API
// ==========================================
export const adminGetAllOrders = () => api.get('/api/admin/orders');

export const adminUpdateOrderStatus = (id: string, status: string) => 
  api.put(`/api/admin/orders/${id}/status`, { status });

export const adminUpdateUserWallet = (userId: string, balance: number) => 
  api.put(`/api/admin/users/${userId}/wallet`, { balance });

export const adminUpdateUserRole = (userId: string, role: string) => 
  api.put(`/api/admin/users/${userId}/role`, { role });

// ==========================================
// Owner API (เพิ่มการเรียกข้อมูลสำหรับร้านค้า)
// ==========================================
export const ownerApi = {
  getShop: () => api.get('/api/owner/shop'),
  updateShop: (data: { name: string }) => api.put('/api/owner/shop', data),
  getProducts: () => api.get('/api/owner/products'),
  createProduct: (data: any) => api.post('/api/owner/products', data),
  updateProduct: (id: string, data: any) => api.put(`/api/owner/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/api/owner/products/${id}`),
  getOrders: () => api.get('/api/owner/orders'),
};

// ==========================================
// Product Comments API
// ==========================================
export const commentApi = {
  getComments: (productId: string) => 
    api.get(`/api/products/${productId}/comments`),
  
  createComment: (productId: string, data: { order_id: string, rating: number, message: string }) => 
    api.post(`/api/products/${productId}/comments`, data),
  
  updateComment: (productId: string, commentId: string, data: { rating: number, message: string }) => 
    api.patch(`/api/products/${productId}/comments/${commentId}`, data),
  
  deleteComment: (productId: string, commentId: string) => 
    api.delete(`/api/products/${productId}/comments/${commentId}`),
};

// ==========================================
// Center API (ศูนย์กระจายสินค้า)
// ==========================================
export const centerApi = {
  getDashboard: () => api.get('/api/center/dashboard'),
  updateProfile: (data: { name: string }) => api.put('/api/center/profile', data),
};

// ==========================================
// Rider API (พนักงานจัดส่ง)
// ==========================================
export const riderApi = {
  getDashboard: () => api.get('/api/rider/dashboard'),
};