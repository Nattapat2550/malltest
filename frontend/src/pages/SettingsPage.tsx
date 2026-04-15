import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getUserAddresses, addUserAddress } from '../services/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ username: '', first_name: '', last_name: '', tel: '', profile_picture_url: '' });
  const [role, setRole] = useState<string>('customer');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [wallet, setWallet] = useState<number>(0);
  const [addresses, setAddresses] = useState<any[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isRequestingShop, setIsRequestingShop] = useState(false);

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      const u = data.user || data; 
      if (u) {
        setProfile({
          username: u.username || '',
          first_name: u.first_name || '', 
          last_name: u.last_name || '', 
          tel: u.tel || '', 
          profile_picture_url: u.profile_picture_url || ''
        });
      }
      if (data.role) setRole(data.role);
    }).catch(console.error);

    api.get('/api/users/me/wallet').then(res => setWallet(res.data.balance || 0)).catch(console.error);
    fetchAddresses();
  }, []);

  const fetchAddresses = () => {
    getUserAddresses().then(res => setAddresses(res.data)).catch(console.error);
  };

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
      const { data } = await api.post('/api/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

  const handleAddNewAddress = async (e: any) => {
    e.preventDefault();
    if(!newTitle || !newAddress) return alert('กรุณากรอกข้อมูลให้ครบ');
    try {
      await addUserAddress({ title: newTitle, address: newAddress });
      setNewTitle('');
      setNewAddress('');
      setShowAddressForm(false);
      fetchAddresses();
      alert('เพิ่มที่อยู่สำเร็จ');
    } catch (error) { alert('เกิดข้อผิดพลาดในการเพิ่มที่อยู่'); }
  };

  const handleRequestOpenShop = async () => {
    setIsRequestingShop(true);
    try {
      await api.post('/api/appeals', {
        topic: 'ขอเปิดร้านค้าใหม่ (Request to Open Shop)',
        message: `ผู้ใช้ ID/Username: ${profile.username} ต้องการขอเปิดร้านค้า`
      });
      alert('ส่งคำขอเปิดร้านค้าเรียบร้อยแล้ว! กรุณารอการอนุมัติจาก Admin');
    } catch (err) { alert('ส่งคำขอสำเร็จ หรือคุณอาจจะเคยส่งคำขอไปแล้ว'); }
    setIsRequestingShop(false);
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

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 space-y-8 animate-fade-in pb-20">
      
      <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-6 lg:p-8 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-medium text-blue-100">กระเป๋าเงินดิจิทัล (Wallet Balance)</h2>
          <p className="text-sm text-blue-200 mt-1">ใช้สำหรับชำระค่าสินค้าภายในระบบ Mall</p>
        </div>
        <div className="text-4xl md:text-5xl font-black">
          ฿{wallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

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

      {/* --- Section ร้านค้า (Seller Center) --- */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">ศูนย์จัดการร้านค้า (Seller Center)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">พื้นที่สำหรับเจ้าของร้านค้าเพื่อจัดการหน้าร้าน สินค้า และออเดอร์</p>
        </div>
        {role === 'owner' || role === 'admin' ? (
          <button onClick={() => navigate('/owner')} className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-md shadow-orange-500/20 whitespace-nowrap">
            เข้าสู่ระบบหลังบ้านร้านค้า
          </button>
        ) : (
          <button onClick={handleRequestOpenShop} disabled={isRequestingShop} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-200 transition shadow-sm whitespace-nowrap">
            {isRequestingShop ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเปิดร้านค้า'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">สมุดที่อยู่ (Address Book)</h3>
          <button onClick={() => setShowAddressForm(!showAddressForm)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-sm">
            {showAddressForm ? 'ยกเลิก' : '+ เพิ่มที่อยู่ใหม่'}
          </button>
        </div>

        {showAddressForm && (
          <form onSubmit={handleAddNewAddress} className="mb-6 p-4 border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ป้ายกำกับ (เช่น บ้าน, คอนโด)</label>
              <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} required className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ที่อยู่จัดส่ง</label>
              <textarea value={newAddress} onChange={e=>setNewAddress(e.target.value)} required rows={2} className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white"></textarea>
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">บันทึก</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.length === 0 ? <p className="text-gray-500">ยังไม่มีที่อยู่ที่บันทึกไว้</p> : addresses.map(a => (
            <div key={a.id} className="p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900">
              <p className="font-bold dark:text-white">{a.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.address}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">ประวัติการสั่งซื้อและสถานะจัดส่ง</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ดูประวัติการสั่งซื้อทั้งหมดของคุณ และติดตามสถานะการจัดส่งแบบละเอียด</p>
        </div>
        <Link to="/my-orders" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20 whitespace-nowrap">ดูคำสั่งซื้อของฉัน</Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-500">Danger Zone</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ปิดการใช้งานบัญชี (หากล็อกอินกลับมาภายใน 30 วัน บัญชีจะถูกกู้คืน)</p>
        </div>
        <button onClick={handleDeleteAccount} className="bg-red-600 text-white py-2.5 px-6 rounded-xl hover:bg-red-700 font-bold whitespace-nowrap">ปิดการใช้งานบัญชี</button>
      </div>
    </div>
  );
}