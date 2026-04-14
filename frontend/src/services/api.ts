// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gtymalltestbe.onrender.com', 
  // เพิ่ม withCredentials เพื่อให้ส่ง HttpOnly Cookie ที่ Backend สร้างไว้ไปด้วย
  withCredentials: true,
});

// ดักจับขาออก (Request) นำ Token จาก localStorage ไปใส่ Header (ถ้ามี)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ดักจับขาเข้า (Response) เพื่อจัดการ Error 401 Unauthorized ทั่วทั้งแอป
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ถ้า Backend ตอบ 401 (ไม่มีสิทธิ์/Token หมดอายุ)
    if (error.response && error.response.status === 401) {
      // ล้างข้อมูล User เก่าทิ้ง
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // ถ้าไม่ได้อยู่หน้า login ให้พากลับไปหน้า login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ==========================================
// API Endpoints
// ==========================================

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