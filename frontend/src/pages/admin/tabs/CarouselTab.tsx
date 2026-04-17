import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { CarouselItem } from '../types';

import ideaImg from '../../../assets/idea.png';
import settingsImg from '../../../assets/settings.png';
import eraserImg from '../../../assets/eraser.png';
import paintImg from '../../../assets/paint.png';

const inputStyle = "w-full p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200";
const labelStyle = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2";

export default function CarouselTab() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);

  const fetchCarousel = async () => {
    try {
      const res = await api.get('/api/admin/carousel');
      setItems(res.data || []);
    } catch (e) {
      console.error("Error fetching carousel");
    }
  };

  useEffect(() => {
    fetchCarousel();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      image_url: formData.get('image_url') as string,
      link_url: formData.get('link_url') as string,
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
    };

    try {
      await api.post('/api/admin/carousel', payload);
      alert("เพิ่มแบนเนอร์สำเร็จ!");
      (e.target as HTMLFormElement).reset();
      fetchCarousel();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการสร้าง");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      image_url: formData.get('image_url') as string,
      link_url: formData.get('link_url') as string,
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    try {
      await api.put(`/api/admin/carousel/${editingItem.id}`, payload);
      alert("แก้ไขแบนเนอร์สำเร็จ!");
      setEditingItem(null);
      fetchCarousel();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("ต้องการลบแบนเนอร์นี้หรือไม่?")) {
      try {
        await api.delete(`/api/admin/carousel/${id}`);
        fetchCarousel();
      } catch (err) {
        alert("ลบไม่สำเร็จ");
      }
    }
  };

  return (
    <div className="space-y-10 w-full">
      {/* ---------------- ฟอร์มเพิ่มแบนเนอร์ ---------------- */}
      <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 p-8 lg:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-400 to-indigo-500"></div>
        
        <h3 className="text-2xl font-black mb-6 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <img src={paintImg} alt="Carousel" className="w-6 h-6 object-contain" />
          </div>
          เพิ่มแบนเนอร์ใหม่ (Carousel)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className={labelStyle}>URL รูปภาพแบนเนอร์</label>
            <input type="text" name="image_url" placeholder="https://example.com/banner.jpg" required className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>URL ลิงก์ (เมื่อคลิก)</label>
            <input type="text" name="link_url" placeholder="https://..." className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>ลำดับการแสดงผล (Sort Order)</label>
            <input type="number" name="sort_order" defaultValue="0" className={inputStyle} />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button type="submit" className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
            <img src={ideaImg} className="w-5 h-5 brightness-0 invert" alt="Add" />
            เพิ่มแบนเนอร์
          </button>
        </div>
      </form>

      {/* ---------------- รายการแบนเนอร์ ---------------- */}
      <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
        <img src={paintImg} alt="List" className="w-6 h-6 dark:invert opacity-80" />
        รายการแบนเนอร์ปัจจุบัน
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
            <div className="aspect-video w-full bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
              <img src={item.image_url} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {!item.is_active && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <span className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Hidden</span>
                </div>
              )}
              <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-xs font-bold">
                Order: {item.sort_order}
              </div>
            </div>
            
            <div className="p-4 flex-1">
              <p className="text-xs text-gray-400 truncate mb-1">Link: {item.link_url || 'None'}</p>
            </div>

            <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingItem(item)} className="flex items-center justify-center gap-2 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl transition-colors font-bold text-sm">
                <img src={settingsImg} className="w-4 h-4 dark:invert" alt="Edit" /> แก้ไข
              </button>
              <button onClick={() => handleDelete(item.id)} className="flex items-center justify-center gap-2 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-xl transition-colors font-bold text-sm">
                <img src={eraserImg} className="w-4 h-4 object-contain" alt="Del" /> ลบ
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- Modal แก้ไขแบนเนอร์ ---------------- */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdate} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col">
            <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <img src={settingsImg} alt="Edit" className="w-5 h-5 object-contain dark:invert opacity-80" />
                </div>
                แก้ไขแบนเนอร์
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-3xl">&times;</button>
            </div>

            <div className="p-8 flex flex-col gap-5">
              <div>
                <label className={labelStyle}>URL รูปภาพแบนเนอร์</label>
                <input type="text" name="image_url" defaultValue={editingItem.image_url} required className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>URL ลิงก์</label>
                <input type="text" name="link_url" defaultValue={editingItem.link_url} className={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>ลำดับการแสดงผล</label>
                  <input type="number" name="sort_order" defaultValue={editingItem.sort_order} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>สถานะ</label>
                  <select name="is_active" defaultValue={String(editingItem.is_active)} className={inputStyle}>
                    <option value="true">แสดงแบนเนอร์</option>
                    <option value="false">ซ่อนแบนเนอร์</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-3xl">
              <button type="button" onClick={() => setEditingItem(null)} className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                ยกเลิก
              </button>
              <button type="submit" className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}