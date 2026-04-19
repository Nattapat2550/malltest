import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function PromotionsPage() {
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [myPromos, setMyPromos] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promoRes, myPromoRes] = await Promise.all([
        api.get('/api/users/promotions/active').catch(() => ({ data: [] })),
        api.get('/api/users/promotions/my').catch(() => ({ data: [] }))
      ]);
      setActivePromos(promoRes.data || []);
      setMyPromos(myPromoRes.data || []);
    } catch (err: any) { 
      console.error("Failed to load promos");
    }
  };

  const handleCollectPromo = async (id: string) => {
    try {
      await api.post('/api/users/promotions/collect', { promotion_id: id });
      alert('เก็บโค้ดสำเร็จ! สามารถใช้ได้ในหน้าชำระเงิน');
      setMyPromos([...myPromos, { promotion_id: id, id }]);
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาดในการเก็บโค้ด');
    }
  };

  const filteredPromos = activePromos.filter(p => {
    if (filter === 'platform') return !p.shop_id;
    if (filter === 'shop') return !!p.shop_id;
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-10 px-6 lg:px-12 2xl:px-20">
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">คลังโค้ดส่วนลด 🎟️</h1>
        <p className="text-gray-500 dark:text-gray-400">เก็บโค้ดสุดคุ้ม แล้วนำไปใช้เป็นส่วนลดในหน้าชำระเงิน</p>
      </div>

      <div className="flex justify-center gap-4 mb-10 overflow-x-auto">
        <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'all' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>ทั้งหมด</button>
        <button onClick={() => setFilter('platform')} className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'platform' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>โค้ดจากแพลตฟอร์ม</button>
        <button onClick={() => setFilter('shop')} className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'shop' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>โค้ดเฉพาะร้านค้า</button>
      </div>

      {filteredPromos.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          ไม่มีโค้ดส่วนลดในหมวดหมู่นี้
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPromos.map(promo => {
            const isCollected = myPromos.some(mp => mp.id === promo.id || mp.promotion_id === promo.id);
            const isShop = !!promo.shop_id;
            return (
              <div key={promo.id} className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden bg-linear-to-br ${isShop ? 'from-green-500 to-teal-600' : 'from-orange-500 to-pink-500'}`}>
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
                {isShop && <span className="absolute top-4 right-4 bg-white/20 px-2 py-1 rounded text-xs font-bold">โค้ดร้านค้า</span>}
                <h3 className="text-3xl font-black mb-2 drop-shadow-md">{promo.code}</h3>
                <p className="text-sm font-medium mb-4 text-white/90">{promo.description}</p>
                <div className="mb-6 space-y-1 text-sm bg-black/10 p-3 rounded-lg">
                  <p>ลด: <span className="font-bold">{promo.discount_type === 'percent' ? `${promo.discount_value}%` : `฿${promo.discount_value}`}</span></p>
                  <p>ขั้นต่ำ: ฿{promo.min_purchase.toLocaleString()}</p>
                  {promo.end_date && <p className="text-xs text-white/70 mt-1">หมดเขต: {new Date(promo.end_date).toLocaleDateString('th-TH')}</p>}
                </div>
                <button 
                  onClick={() => handleCollectPromo(promo.id)}
                  disabled={isCollected}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md ${isCollected ? 'bg-white/30 cursor-not-allowed text-white' : 'bg-white text-gray-900 hover:scale-105'}`}
                >
                  {isCollected ? 'เก็บแล้ว' : 'เก็บโค้ด'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}