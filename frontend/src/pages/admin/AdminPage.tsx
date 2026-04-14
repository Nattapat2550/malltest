// frontend/src/pages/admin/AdminPage.tsx
import React, { useState } from 'react';

import UsersTab from './tabs/UsersTab';
import NewsTab from './tabs/NewsTab';
import AppealsTab from './tabs/AppealsTab';
import CarouselTab from './tabs/CarouselTab';
import DocumentsTab from './tabs/DocumentsTab';

// สมมติว่ามี ProductsTab เพื่อจัดการสินค้า
import ProductsTab from './tabs/ProductsTab'; 

// นำเข้าไอคอนสำหรับเมนู
import userImg from '../../assets/user.png';
import ideaImg from '../../assets/idea.png';
import settingsImg from '../../assets/settings.png'; 

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <img src={settingsImg} alt="Admin" className="w-8 h-8 dark:invert opacity-80" />
            Admin Dashboard
          </h2>
          
          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 mt-6">
            <TabButton id="users" label="จัดการผู้ใช้งาน" active={activeTab} onClick={setActiveTab} icon={userImg} />
            
            {/* เพิ่มเมนูจัดการสินค้าเข้ามาตรงนี้ */}
            <TabButton id="products" label="จัดการสินค้า (Mall)" active={activeTab} onClick={setActiveTab} icon={ideaImg} />
            
            <TabButton id="news" label="จัดการข่าวสาร" active={activeTab} onClick={setActiveTab} icon={ideaImg} />
            <TabButton id="appeals" label="ระบบคำร้องเรียน" active={activeTab} onClick={setActiveTab} icon={ideaImg} />
            <TabButton id="carousel" label="จัดการแบนเนอร์" active={activeTab} onClick={setActiveTab} icon={ideaImg} />
            <TabButton id="documents" label="จัดการข้อมูล & แกลเลอรี" active={activeTab} onClick={setActiveTab} icon={ideaImg} />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 min-h-[70vh] animate-fade-in">
          {/* แสดง Component ตาม Tab ที่กำลัง Active */}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'news' && <NewsTab />}
          {activeTab === 'appeals' && <AppealsTab />}
          {activeTab === 'carousel' && <CarouselTab />}
          {activeTab === 'documents' && <DocumentsTab />}
        </div>
        
      </div>
    </div>
  );
}

// ใช้งาน Icon ร่วมกับ Tab
function TabButton({ id, label, active, onClick, icon }: { id: string, label: string, active: string, onClick: (id: string) => void, icon: string }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm border ${
        isActive 
          ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 hover:bg-blue-700' 
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
      }`}
    >
      <img 
        src={icon} 
        alt={label} 
        className={`w-5 h-5 object-contain ${isActive ? 'brightness-0 invert' : 'dark:invert opacity-70'}`} 
      />
      {label}
    </button>
  );
}