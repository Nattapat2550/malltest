// frontend/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ username: '', first_name: '', last_name: '', tel: '', profile_picture_url: '' });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // เพิ่ม State สำหรับ Wallet และ Orders
  const [wallet, setWallet] = useState<number>(0);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // ดึงโปรไฟล์
    api.get('/api/users/me').then(({ data }) => setProfile({
      username: data.username || '',
      first_name: data.first_name || '', 
      last_name: data.last_name || '', 
      tel: data.tel || '', 
      profile_picture_url: data.profile_picture_url || ''
    })).catch(console.error);

    // ดึงยอดเงิน
    api.get('/api/users/me/wallet')
      .then(res => setWallet(res.data.balance || 0))
      .catch(console.error);

    // ดึงประวัติการสั่งซื้อ
    api.get('/api/orders')
      .then(res => setOrders(res.data || []))
      .catch(console.error);
  }, []);

  const handleUpdateProfile = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/api/users/me', profile); 
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.username = profile.username;
        u.first_name = profile.first_name;
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('storage'));
      }

      setSuccessMsg('บันทึกข้อมูลสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) { 
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึก หรือ Username นี้ถูกใช้ไปแล้ว'); 
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await api.post('/api/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile({ ...profile, profile_picture_url: data.profile_picture_url });
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.profile_picture_url = data.profile_picture_url;
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('storage'));
      }

      alert('เปลี่ยนรูปโปรไฟล์สำเร็จ');
    } catch (err: any) { alert('ไฟล์รูปภาพใหญ่เกินไป หรือเกิดข้อผิดพลาด'); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? (คุณสามารถกู้คืนได้เมื่อกลับมาล็อกอินใหม่)")) {
      try {
        await api.put('/api/users/me', { status: 'deleted' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } catch (err: any) { alert('เกิดข้อผิดพลาดในการลบ'); }
    }
  };

  // ฟังก์ชันช่วยแสดงสีสถานะ
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-bold">รอชำระเงิน</span>;
      case 'paid': return <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold">ชำระแล้ว รอจัดส่ง</span>;
      case 'shipped': return <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-bold">กำลังจัดส่ง</span>;
      case 'completed': return <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold">จัดส่งสำเร็จ</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold">ยกเลิกแล้ว</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 space-y-8 animate-fade-in pb-20">
      
      {/* 1. Wallet Section */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-6 lg:p-8 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-medium text-blue-100">กระเป๋าเงินดิจิทัล (Wallet Balance)</h2>
          <p className="text-sm text-blue-200 mt-1">ใช้สำหรับชำระค่าสินค้าภายในระบบ Mall</p>
        </div>
        <div className="text-4xl md:text-5xl font-black">
          ฿{wallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* 2. Profile Section (ของเดิม) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8">
        <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 text-gray-900 dark:text-white">ตั้งค่าโปรไฟล์ส่วนตัว</h2>
        
        {successMsg && <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl font-medium">{successMsg}</div>}

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center space-y-4 shrink-0">
            <div className="w-32 h-32 rounded-full border-4 border-blue-100 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {profile.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 dark:text-gray-500 text-sm">ไม่มีรูป</span>
              )}
            </div>
            <label className="cursor-pointer bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-5 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition text-sm font-medium">
              อัปโหลดรูปภาพ
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          <form onSubmit={handleUpdateProfile} className="flex-1 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input type="text" value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value})} className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อจริง</label>
                <input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">นามสกุล</label>
                <input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เบอร์โทรศัพท์</label>
              <input type="tel" value={profile.tel} onChange={(e) => setProfile({...profile, tel: e.target.value})} className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20 mt-2">
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
            </button>
          </form>
        </div>
      </div>

      {/* 3. Order History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ประวัติการสั่งซื้อ และ สถานะจัดส่ง</h2>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            คุณยังไม่มีประวัติการสั่งซื้อ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                  <th className="p-4 font-bold whitespace-nowrap">รหัสออเดอร์</th>
                  <th className="p-4 font-bold whitespace-nowrap">วันที่สั่งซื้อ</th>
                  <th className="p-4 font-bold whitespace-nowrap">ยอดรวม</th>
                  <th className="p-4 font-bold whitespace-nowrap">สถานะจัดส่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">#{o.id}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(o.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                      ฿{o.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(o.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Appeals Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">การช่วยเหลือและการร้องเรียน</h3>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-xl border border-orange-100 dark:border-orange-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-orange-800 dark:text-orange-400">ยื่นคำร้องปลดแบน / รายงานปัญหา</h4>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
              หากคุณพบปัญหาหรือต้องการติดต่อทีมงาน
            </p>
          </div>
          <Link 
            to="/appeals" 
            className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition shadow-md shadow-orange-500/20 whitespace-nowrap"
          >
            ยื่นคำร้อง
          </Link>
        </div>
      </div>

      {/* 5. Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-500">Danger Zone</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ปิดการใช้งานบัญชี (หากล็อกอินกลับมาภายใน 30 วัน บัญชีจะถูกกู้คืน)
          </p>
        </div>
        <button 
          onClick={handleDeleteAccount} 
          className="bg-red-600 text-white py-2.5 px-6 rounded-xl hover:bg-red-700 transition font-bold whitespace-nowrap"
        >
          ปิดการใช้งานบัญชี
        </button>
      </div>

    </div>
  );
}