import React, { useState, useEffect, useRef } from 'react';
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

  // States สำหรับฟอร์มที่อยู่ใหม่
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [addrDetail, setAddrDetail] = useState(''); 
  const [addrSubdistrict, setAddrSubdistrict] = useState(''); 
  const [addrDistrict, setAddrDistrict] = useState(''); 
  const [addrProvince, setAddrProvince] = useState(''); 
  const [addrCountry, setAddrCountry] = useState('ประเทศไทย');

  // Autocomplete States
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLFormElement>(null);

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

    // โหลดข้อมูล JSON ที่อยู่ประเทศไทย
    fetch('/thai_addresses.json')
      .then(res => res.json())
      .then(data => {
        const formatted = data.map((item: any) => ({
          subdistrict: item.district || item.tambon || item.subdistrict || '',
          district: item.amphoe || item.district || '',
          province: item.province || ''
        }));
        setAllAddresses(formatted);
      })
      .catch(err => console.error("โหลดข้อมูลที่อยู่ประเทศไทยไม่สำเร็จ", err));

    // ปิด dropdown เมื่อคลิกที่อื่น
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAddresses = () => {
    getUserAddresses().then(res => setAddresses(res.data)).catch(console.error);
  };

  const handleAddressSearch = (keyword: string, field: 'subdistrict' | 'district' | 'province') => {
    if (field === 'subdistrict') setAddrSubdistrict(keyword);
    if (field === 'district') setAddrDistrict(keyword);
    if (field === 'province') setAddrProvince(keyword);

    if (!keyword || allAddresses.length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const filtered = allAddresses.filter(item => 
      item.subdistrict.includes(keyword) || 
      item.district.includes(keyword) || 
      item.province.includes(keyword)
    ).slice(0, 20);

    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const selectAddressMatch = (item: any) => {
    setAddrSubdistrict(item.subdistrict);
    setAddrDistrict(item.district);
    setAddrProvince(item.province);
    setShowDropdown(false);
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
    if(!newTitle || !addrDetail || !addrSubdistrict || !addrDistrict || !addrProvince) {
      return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
    
    // แปลงข้อมูลฟิลด์ต่างๆ ให้กลับมาเป็น String เดียวเพื่อส่งให้ DB
    const finalAddress = `${addrDetail} แขวง/ตำบล${addrSubdistrict} เขต/อำเภอ${addrDistrict} จ.${addrProvince} ประเทศ${addrCountry}`;
    
    try {
      await addUserAddress({ title: newTitle, address: finalAddress });
      setNewTitle('');
      setAddrDetail('');
      setAddrSubdistrict('');
      setAddrDistrict('');
      setAddrProvince('');
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

      {/* --- Sections บทบาทผู้ใช้ (Seller/Center/Rider) --- */}
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

      {(role === 'center' || role === 'admin') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-purple-200 dark:border-purple-900/50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-purple-900 dark:text-purple-400">ระบบคัดแยกพัสดุ (Delivery Center)</h3>
            <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">พื้นที่สำหรับรับเข้าพัสดุและกระจายงานต่อให้พนักงานขนส่ง</p>
          </div>
          <button onClick={() => navigate('/center')} className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-md shadow-purple-500/20 whitespace-nowrap">
            เข้าสู่ระบบจัดการศูนย์
          </button>
        </div>
      )}
      
      {(role === 'rider' || role === 'admin') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-pink-200 dark:border-pink-900/50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-pink-600 dark:text-pink-400">ระบบพนักงานจัดส่ง (Rider Dashboard)</h3>
            <p className="text-sm text-pink-600/80 dark:text-pink-300 mt-1">ดูรายการพัสดุที่ต้องนำจ่าย และอัปเดตสถานะการจัดส่งให้ลูกค้า</p>
          </div>
          <button onClick={() => navigate('/rider')} className="px-6 py-2.5 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition shadow-md shadow-pink-500/20 whitespace-nowrap">
            เปิดระบบนำจ่ายพัสดุ
          </button>
        </div>
      )}

      {/* --- Section สมุดที่อยู่ --- */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">สมุดที่อยู่ (Address Book)</h3>
          <button onClick={() => setShowAddressForm(!showAddressForm)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-sm">
            {showAddressForm ? 'ยกเลิก' : '+ เพิ่มที่อยู่ใหม่'}
          </button>
        </div>

        {showAddressForm && (
          <form onSubmit={handleAddNewAddress} className="mb-6 p-6 border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl space-y-4 relative" ref={dropdownRef}>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ป้ายกำกับ (เช่น บ้าน, คอนโด)</label>
              <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none" placeholder="บ้าน" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">เลขที่, หมู่, ซอย, ถนน</label>
              <input type="text" value={addrDetail} onChange={e => setAddrDetail(e.target.value)} required placeholder="เช่น 123/45 ซอยสุขุมวิท 1" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">แขวง / ตำบล</label>
                <input type="text" value={addrSubdistrict} required onChange={e => handleAddressSearch(e.target.value, 'subdistrict')} placeholder="พิมพ์แขวง/ตำบล" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">เขต / อำเภอ</label>
                <input type="text" value={addrDistrict} required onChange={e => handleAddressSearch(e.target.value, 'district')} placeholder="พิมพ์เขต/อำเภอ" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">จังหวัด</label>
                <input type="text" value={addrProvince} required onChange={e => handleAddressSearch(e.target.value, 'province')} placeholder="พิมพ์จังหวัด" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ประเทศ</label>
                <input type="text" value={addrCountry} required onChange={e => setAddrCountry(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
            </div>

            {/* Dropdown Autocomplete สำหรับหน้า Settings */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-10 w-[calc(100%-3rem)] mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => selectAddressMatch(item)}
                    className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    {item.subdistrict} » {item.district} » {item.province}
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md w-full md:w-auto mt-4 transition">บันทึกที่อยู่</button>
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