import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import OwnerPage from './pages/owner/OwnerPage';
import CenterPage from './pages/center/CenterPage';
import RiderPage from './pages/rider/RiderPage';
import 'react-quill-new/dist/quill.snow.css';

import { useServerWakeup } from './hooks/useServerWakeup';
import { useOAuthCallback } from './hooks/useOAuthCallback';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CheckCodePage = lazy(() => import('./pages/CheckCodePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));
const AppealsPage = lazy(() => import('./pages/AppealPage'));
const DocumentDetailsPage = lazy(() => import('./pages/DocumentDetailsPage'));
const ProductCatalog = lazy(() => import('./pages/ProductCatalog'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
// หน้าใหม่ โปรโมชั่นรวม
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'));

const App: React.FC = () => {
  const { serverReady, wakingUp } = useServerWakeup();
  useOAuthCallback();

  if (!serverReady) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-6 text-center transition-colors duration-300">
        <div className="relative flex justify-center items-center mb-8">
          <div className="absolute animate-ping inline-flex h-20 w-20 rounded-full bg-blue-400 opacity-20"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
        <h1 className="text-2xl md:text-3xl font-black mb-3">กำลังเชื่อมต่อกับเซิร์ฟเวอร์...</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm md:text-base font-medium">
          {wakingUp 
            ? "กำลังปลุกระบบฐานข้อมูลและเซิร์ฟเวอร์ (อาจใช้เวลา 30-50 วินาทีในครั้งแรกเนื่องจากระบบประหยัดพลังงาน) กรุณารอสักครู่ ⏳" 
            : "ระบบกำลังเตรียมความพร้อม..."}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-xl dark:text-white bg-gray-50 dark:bg-gray-900">กำลังโหลดข้อมูล...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check" element={<CheckCodePage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
          <Route path="/documents/:id" element={<DocumentDetailsPage />} />
          <Route path="/appeals" element={<AppealsPage />} />

          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/promotions" element={<ProtectedRoute><PromotionsPage /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><ProductCatalog /></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
          
          <Route path="/shop/:id" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
          
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
          
          <Route path="/malls" element={<Navigate to="/products" replace />} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/download" element={<ProtectedRoute><DownloadPage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
          <Route path="/owner" element={<ProtectedRoute><OwnerPage /></ProtectedRoute>} />
          <Route path="/center" element={<ProtectedRoute><CenterPage /></ProtectedRoute>} />
          <Route path="/rider" element={<ProtectedRoute><RiderPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;