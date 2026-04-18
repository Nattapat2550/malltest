import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function PromotionsTab() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: '', description: '', discount_type: 'fixed', discount_value: 0,
    max_discount: '', min_purchase: 0, usage_limit: 0,
    start_date: new Date().toISOString().slice(0, 16), end_date: '', is_active: true
  });
  
  // สถานะเพื่อแสดงผู้ใช้งานที่เก็บโค้ดนี้
  const [viewingUsers, setViewingUsers] = useState<any[] | null>(null);
  const [viewingPromo, setViewingPromo] = useState<string>('');

  const loadData = async () => {
    const res = await api.get('/api/admin/promotions');
    setPromotions(res.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discount_value: Number(formData.discount_value),
        max_discount: formData.max_discount ? Number(formData.max_discount) : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        start_date: new Date(formData.start_date).toISOString()
      };
      await api.post('/api/admin/promotions', payload);
      loadData();
      alert('สร้างโปรโมชั่นสำเร็จ');
    } catch (err: any) { alert('Error: ' + err.response?.data?.error); }
  };

  const handleViewUsers = async (id: string, code: string) => {
    const res = await api.get(`/api/admin/promotions/${id}/users`);
    setViewingUsers(res.data);
    setViewingPromo(code);
  };

  const handleDelete = async (id: string) => {
    if(confirm('ต้องการลบโปรโมชั่นนี้ใช่หรือไม่?')) {
        await api.delete(`/api/admin/promotions/${id}`);
        loadData();
    }
  }

  return (
    <div className="space-y-8">
      {/* ส่วนฟอร์มสร้างโค้ด */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 dark:text-white">สร้างโค้ดส่วนลดใหม่</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm dark:text-gray-300">โค้ด (เช่น NY2024)</label><input type="text" required className="w-full p-2 border rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></div>
          <div><label className="block text-sm dark:text-gray-300">ประเภทส่วนลด</label>
            <select className="w-full p-2 border rounded" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                <option value="fixed">ลดเป็นบาท</option>
                <option value="percent">ลดเป็น %</option>
                <option value="free_shipping">ส่งฟรี</option>
            </select>
          </div>
          <div><label className="block text-sm dark:text-gray-300">มูลค่าที่ลด (บาท หรือ %)</label><input type="number" required className="w-full p-2 border rounded" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: Number(e.target.value)})} /></div>
          {formData.discount_type === 'percent' && <div><label className="block text-sm dark:text-gray-300">ลดสูงสุดกี่บาท</label><input type="number" className="w-full p-2 border rounded" value={formData.max_discount} onChange={e => setFormData({...formData, max_discount: e.target.value})} /></div>}
          
          <div><label className="block text-sm dark:text-gray-300">ขั้นต่ำในการสั่งซื้อ</label><input type="number" required className="w-full p-2 border rounded" value={formData.min_purchase} onChange={e => setFormData({...formData, min_purchase: Number(e.target.value)})} /></div>
          <div><label className="block text-sm dark:text-gray-300">จำกัดสิทธิ์ (0 = ไม่จำกัด)</label><input type="number" required className="w-full p-2 border rounded" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: Number(e.target.value)})} /></div>
          
          <div className="md:col-span-2"><label className="block text-sm dark:text-gray-300">คำอธิบาย</label><input type="text" className="w-full p-2 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
          
          <button type="submit" className="md:col-span-2 bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">สร้างโค้ดส่วนลด</button>
        </form>
      </div>

      {/* ตารางแสดงโค้ดและจำนวนสิทธิ์ */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse dark:text-white">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="p-3">Code</th><th className="p-3">ประเภท</th><th className="p-3">สิทธิ์การใช้</th><th className="p-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map(p => (
              <tr key={p.id} className="border-b dark:border-gray-700">
                <td className="p-3 font-bold">{p.code} <br/><span className="text-xs font-normal text-gray-500">{p.description}</span></td>
                <td className="p-3">{p.discount_type} ({p.discount_value})</td>
                <td className="p-3">{p.used_count} / {p.usage_limit === 0 ? 'ไม่จำกัด' : p.usage_limit}</td>
                <td className="p-3 flex gap-2">
                    <button onClick={() => handleViewUsers(p.id, p.code)} className="bg-green-500 text-white px-3 py-1 rounded text-sm">ดูผู้ใช้</button>
                    <button onClick={() => handleDelete(p.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal ดูข้อมูลคนที่เก็บโค้ดและใช้ไปแล้ว */}
      {viewingUsers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-white">ประวัติการใช้งานโค้ด {viewingPromo}</h2>
                    <button onClick={() => setViewingUsers(null)} className="text-red-500 font-bold">ปิด X</button>
                </div>
                {viewingUsers.length === 0 ? <p className="text-gray-500 text-center py-4">ยังไม่มีผู้ใช้เก็บโค้ดนี้</p> : (
                    <ul className="space-y-3">
                        {viewingUsers.map((u, i) => (
                            <li key={i} className="border p-3 rounded-lg flex justify-between items-center dark:border-gray-700">
                                <div>
                                    <p className="font-bold text-sm dark:text-white">User ID: {u.user_id}</p>
                                    <p className="text-xs text-gray-500">เก็บเมื่อ: {new Date(u.collected_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.is_used ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {u.is_used ? 'ใช้งานแล้ว' : 'ยังไม่ใช้'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      )}
    </div>
  );
}