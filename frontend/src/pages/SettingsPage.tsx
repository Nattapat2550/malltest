import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getUserAddresses, addUserAddress } from '../services/api';
import { compressImage } from '../utils/imageCompression';

export default function SettingsPage() {
 const navigate = useNavigate();
 const [profile, setProfile] = useState({ username: '', first_name: '', last_name: '', tel: '', profile_picture_url: '' });
 const [role, setRole] = useState<string>('customer');
 const [loading, setLoading] = useState(false);
 const [successMsg, setSuccessMsg] = useState('');
 
 const [wallet, setWallet] = useState<number>(0);
 const [addresses, setAddresses] = useState<any[]>([]);

 const [showAddressForm, setShowAddressForm] = useState(false);
 const [newTitle, setNewTitle] = useState('');
 const [addrDetail, setAddrDetail] = useState(''); 
 const [addrSubdistrict, setAddrSubdistrict] = useState(''); 
 const [addrDistrict, setAddrDistrict] = useState(''); 
 const [addrProvince, setAddrProvince] = useState(''); 
 const [addrCountry, setAddrCountry] = useState('ประเทศไทย');

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
 .catch(err => console.error("โหลดข้อมูลตำบลล้มเหลว", err));

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
 setSuccessMsg('บันทึกข้อมูลเรียบร้อยแล้ว');
 setTimeout(() => setSuccessMsg(''), 3000);
 } catch (err: any) { 
 alert(err.response?.data?.error || 'มีผู้ใช้งาน Username นี้แล้ว'); 
 }
 setLoading(false);
 };

 const handleAvatarChange = async (e: any) => {
 const file = e.target.files[0];
 if (!file) return;
 const compressedFile = await compressImage(file);
 const formData = new FormData();
 formData.append('avatar', compressedFile);
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
 alert('อัปเดตรูปโปรไฟล์สำเร็จ');
 } catch (err: any) { alert('ไฟล์ไม่ถูกต้องหรือขนาดใหญ่เกินไป'); }
 };

 const handleAddNewAddress = async (e: any) => {
 e.preventDefault();
 if(!newTitle || !addrDetail || !addrSubdistrict || !addrDistrict || !addrProvince) {
 return alert('กรุณากรอกที่อยู่ให้ครบถ้วน');
 }
 
 const finalAddress = `${addrDetail} ต.${addrSubdistrict} อ.${addrDistrict} จ.${addrProvince} ${addrCountry}`;
 
 try {
 await addUserAddress({ title: newTitle, address: finalAddress });
 setNewTitle('');
 setAddrDetail('');
 setAddrSubdistrict('');
 setAddrDistrict('');
 setAddrProvince('');
 setShowAddressForm(false);
 fetchAddresses();
 alert('เพิ่มที่อยู่เรียบร้อยแล้ว');
 } catch (error) { alert('ไม่สามารถเพิ่มที่อยู่ได้'); }
 };

 const handleRequestOpenShop = async () => {
 setIsRequestingShop(true);
 try {
 await api.post('/api/appeals', {
 topic: 'ขอเปิดร้านค้า (Request to Open Shop)',
 message: `ขออนุญาตเปิดร้านค้าในแพลตฟอร์ม ID/Username: ${profile.username}`
 });
 alert('ส่งคำขอเปิดร้านค้าเรียบร้อยแล้ว กรุณารอ Admin อนุมัติ');
 } catch (err) { alert('ไม่สามารถส่งคำขอได้ในขณะนี้'); }
 setIsRequestingShop(false);
 };

 const handleDeleteAccount = async () => {
 if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? (ไม่สามารถกู้คืนได้)")) {
 try {
 await api.put('/api/users/me', { status: 'deleted' });
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 window.location.href = '/login';
 } catch (err: any) { alert('ไม่สามารถลบบัญชีได้'); }
 }
 };

 return (
 <div className="max-w-4xl mx-auto p-6 mt-10 space-y-8 animate-fade-in pb-20">
 
 <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-md p-6 lg:p-8 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
 <div>
 <h2 className="text-lg font-medium text-blue-100">ยอดเงินคงเหลือ (Wallet Balance)</h2>
 <p className="text-sm text-blue-200 mt-1">ใช้ชำระค่าสินค้าภายใน Mall</p>
 </div>
 <div className="text-4xl md:text-5xl font-black">
 ฿ {wallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </div>
 </div>

 <div className="bg-canvas rounded-md shadow-sm border border-slate-200 p-6 lg:p-8">
 <h2 className="text-2xl font-bold border-b border-slate-200 pb-4 mb-6 text-slate-900 ">โปรไฟล์ส่วนตัว</h2>
 {successMsg && <div className="mb-6 p-4 bg-green-50 /30 border border-green-200 text-green-700 rounded-md font-medium">{successMsg}</div>}
 <div className="flex flex-col md:flex-row gap-8">
 <div className="flex flex-col items-center space-y-4 shrink-0">
 <div className="w-32 h-32 rounded-full border-4 border-blue-100 overflow-hidden bg-surface-soft flex items-center justify-center">
 {profile.profile_picture_url ? (
 <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
 ) : (
 <span className="text-slate-400 text-sm">ไม่มีรูปภาพ</span>
 )}
 </div>
 <label className="cursor-pointer bg-canvas border border-slate-200 text-slate-700 py-2 px-5 rounded-md shadow-sm hover:bg-surface-soft dark:hover:bg-slate-600 transition text-sm font-medium">
 เปลี่ยนรูปโปรไฟล์
 <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
 </label>
 </div>
 <form onSubmit={handleUpdateProfile} className="flex-1 space-y-5">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
 <input type="text" value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value})} className="block w-full border border-slate-300 rounded-md p-3 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" required />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ</label>
 <input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="block w-full border border-slate-300 rounded-md p-3 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">นามสกุล</label>
 <input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="block w-full border border-slate-300 rounded-md p-3 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
 <input type="tel" value={profile.tel} onChange={(e) => setProfile({...profile, tel: e.target.value})} className="block w-full border border-slate-300 rounded-md p-3 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-active transition shadow-md shadow-blue-500/20 mt-2">
 {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
 </button>
 </form>
 </div>
 </div>

 <div className="bg-canvas rounded-md shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
 <div>
 <h3 className="text-xl font-bold text-slate-900 ">ศูนย์จัดการร้านค้า (Seller Center)</h3>
 <p className="text-sm text-slate-500 mt-1">จัดการสินค้าและออเดอร์ในร้านของคุณ</p>
 </div>
 {role === 'owner' || role === 'admin' ? (
 <button onClick={() => navigate('/owner')} className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-md hover:bg-orange-600 transition shadow-md shadow-orange-500/20 whitespace-nowrap">
 ไปยังศูนย์จัดการร้านค้า
 </button>
 ) : (
 <button onClick={handleRequestOpenShop} disabled={isRequestingShop} className="px-6 py-2.5 bg-surface-soft text-slate-900 font-bold rounded-md hover:bg-slate-200 transition shadow-sm whitespace-nowrap">
 {isRequestingShop ? 'ส่งคำขอแล้ว...' : 'สมัครเปิดร้านค้า'}
 </button>
 )}
 </div>

 {(role === 'center' || role === 'admin') && (
 <div className="bg-canvas rounded-md shadow-sm border border-teal-200 /50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
 <div>
 <h3 className="text-xl font-bold text-teal-900 ">ศูนย์กระจายสินค้า (Delivery Center)</h3>
 <p className="text-sm text-teal-600 mt-1">จัดการพัสดุและมอบหมายงานให้ Rider</p>
 </div>
 <button onClick={() => navigate('/center')} className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-md hover:bg-teal-700 transition shadow-md shadow-teal-500/20 whitespace-nowrap">
 ไปยังศูนย์กระจายสินค้า
 </button>
 </div>
 )}
 
 {(role === 'rider' || role === 'admin') && (
 <div className="bg-canvas rounded-md shadow-sm border border-pink-200 /50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
 <div>
 <h3 className="text-xl font-bold text-pink-600 ">ระบบคนขับ (Rider Dashboard)</h3>
 <p className="text-sm text-pink-600/80 mt-1">จัดการสถานะการจัดส่งพัสดุถึงมือลูกค้า</p>
 </div>
 <button onClick={() => navigate('/rider')} className="px-6 py-2.5 bg-pink-600 text-white font-bold rounded-md hover:bg-pink-700 transition shadow-md shadow-pink-500/20 whitespace-nowrap">
 ไปยังหน้าคนขับ
 </button>
 </div>
 )}

 <div className="bg-canvas rounded-md shadow-sm border border-slate-200 p-6 lg:p-8">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-xl font-bold text-slate-900 ">สมุดที่อยู่ (Address Book)</h3>
 <button onClick={() => setShowAddressForm(!showAddressForm)} className="px-4 py-2 bg-surface-soft text-slate-900 rounded-sm font-bold text-sm">
 {showAddressForm ? 'ยกเลิก' : '+ เพิ่มที่อยู่'}
 </button>
 </div>
 
 {showAddressForm && (
 <form onSubmit={handleAddNewAddress} className="mb-6 p-6 border border-blue-200 bg-blue-50/50 /10 rounded-md space-y-4 relative" ref={dropdownRef}>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อเรียก (เช่น บ้าน, ที่ทำงาน)</label>
 <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} required className="w-full px-4 py-3 rounded-md border border-slate-200 bg-canvas text-slate-900 outline-none" placeholder="บ้าน" />
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1">บ้านเลขที่, ถนน, ซอย</label>
 <input type="text" value={addrDetail} onChange={e => setAddrDetail(e.target.value)} required placeholder="เลขที่ 123/45 หมู่ 1" className="w-full px-4 py-3 rounded-md border border-slate-200 bg-canvas text-slate-900 outline-none" />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="relative">
 <label className="block text-sm font-bold text-slate-700 mb-1">ตำบล/แขวง</label>
 <input type="text" value={addrSubdistrict} required onChange={e => handleAddressSearch(e.target.value, 'subdistrict')} placeholder="ค้นหาตำบล..." className="w-full px-4 py-3 rounded-md border border-slate-200 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 
 <div className="relative">
 <label className="block text-sm font-bold text-slate-700 mb-1">อำเภอ/เขต</label>
 <input type="text" value={addrDistrict} required onChange={e => handleAddressSearch(e.target.value, 'district')} placeholder="ค้นหาอำเภอ..." className="w-full px-4 py-3 rounded-md border border-slate-200 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
 </div>

 <div className="relative">
 <label className="block text-sm font-bold text-slate-700 mb-1">จังหวัด</label>
 <input type="text" value={addrProvince} required onChange={e => handleAddressSearch(e.target.value, 'province')} placeholder="ค้นหาจังหวัด..." className="w-full px-4 py-3 rounded-md border border-slate-200 bg-canvas text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
 </div>

 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1">ประเทศ</label>
 <input type="text" value={addrCountry} required onChange={e => setAddrCountry(e.target.value)} className="w-full px-4 py-3 rounded-md border border-slate-200 bg-surface-soft text-slate-900 outline-none" />
 </div>
 </div>

 {showDropdown && suggestions.length > 0 && (
 <div className="absolute z-10 w-[calc(100%-3rem)] mt-1 bg-canvas border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
 {suggestions.map((item, idx) => (
 <div 
 key={idx} 
 onClick={() => selectAddressMatch(item)}
 className="px-4 py-3 hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-slate-700 dark:hover:text-blue-100 cursor-pointer text-sm text-blue-900 border-b border-slate-100 last:border-0"
 >
 {item.subdistrict} » {item.district} » {item.province}
 </div>
 ))}
 </div>
 )}
 
 <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary-active text-white font-bold rounded-md shadow-md w-full md:w-auto mt-4 transition">บันทึกที่อยู่</button>
 </form>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {addresses.length === 0 ? <p className="text-slate-500">ไม่มีข้อมูลที่อยู่</p> : addresses.map(a => (
 <div key={a.id} className="p-4 border rounded-md bg-canvas ">
 <p className="font-bold ">{a.title}</p>
 <p className="text-sm text-slate-600 mt-1">{a.address}</p>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-canvas rounded-md shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
 <div>
 <h3 className="text-xl font-bold text-slate-900 ">ประวัติคำสั่งซื้อ</h3>
 <p className="text-sm text-slate-500 mt-1">ดูประวัติการสั่งซื้อและสถานะพัสดุของคุณ</p>
 </div>
 <Link to="/my-orders" className="px-6 py-2.5 bg-primary text-white font-bold rounded-md hover:bg-primary-active transition shadow-md shadow-blue-500/20 whitespace-nowrap">ดูคำสั่งซื้อทั้งหมด</Link>
 </div>

 <div className="bg-canvas rounded-md shadow-sm border border-red-200 /50 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
 <div>
 <h3 className="text-xl font-bold text-red-600 ">Danger Zone</h3>
 <p className="text-sm text-slate-500 mt-1">การลบบัญชีจะเป็นการลบข้อมูล (สามารถเปิดใช้งานใหม่ได้ภายใน 30 วัน)</p>
 </div>
 <button onClick={handleDeleteAccount} className="bg-red-600 text-white py-2.5 px-6 rounded-md hover:bg-red-700 font-bold whitespace-nowrap">ลบบัญชี</button>
 </div>

 </div>
 );
}