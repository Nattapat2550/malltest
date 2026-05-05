import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import heroImg from '../assets/hero.png';
import ideaImg from '../assets/idea.png';

interface Carousel { id: number; image_url: string; link_url: string; is_active: boolean; }
interface DocumentItem { id: number; title: string; cover_image: string; is_active: boolean; }

export default function HomePage() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [myPromos, setMyPromos] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [carouselRes, docRes, promoRes, myPromoRes] = await Promise.all([
          api.get('/api/carousel').catch(() => ({ data: [] })), 
          api.get('/api/documents/list').catch(() => ({ data: [] })),
          api.get('/api/users/promotions/active').catch(() => ({ data: [] })),
          api.get('/api/users/promotions/my').catch(() => ({ data: [] }))
        ]);
        setCarousels(carouselRes.data || []);
        setDocuments(docRes.data || []);
        setActivePromos((promoRes.data || []).slice(0, 4));
        setMyPromos(myPromoRes.data || []);
      } catch (err: any) { console.error("Failed to load initial data"); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (carousels.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carousels.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carousels.length]);

  const handleCollectPromo = async (id: string) => {
    try {
      await api.post('/api/users/promotions/collect', { promotion_id: id });
      alert('เก็บโค้ดส่วนลดสำเร็จ!');
      setMyPromos([...myPromos, { promotion_id: id, id }]);
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'เก็บโค้ดไม่สำเร็จ');
    }
  };

  return (
    <div className="w-full overflow-x-hidden bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      <div className="relative bg-linear-to-br from-blue-900 via-indigo-900 to-slate-900 text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] bg-blue-600 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[120%] bg-pink-600 rounded-full blur-[150px] mix-blend-screen"></div>
        </div>
        <div className="w-full px-6 lg:px-12 2xl:px-20 py-16 lg:py-24 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left flex-1">
            <span className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-md text-sm font-bold tracking-widest uppercase mb-6 border border-white/20 text-cyan-200">
              The Ultimate Experience
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-lg">
              Unlock Your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-cyan-400">Shopping</span> Journey
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto md:mx-0 mb-8">
              สัมผัสประสบการณ์การช็อปปิ้งที่ไร้ขีดจำกัด พร้อมโปรโมชันจัดเต็มตลอดปี สินค้าของแท้ 100% ส่งตรงถึงหน้าบ้านคุณ
            </p>
            <Link to="/products" className="inline-block bg-linear-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3.5 px-10 rounded-full shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300">
              เริ่มช็อปเลย
            </Link>
          </div>
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative w-64 md:w-80 lg:w-96">
              <div className="absolute inset-0 bg-linear-to-t from-blue-600 to-cyan-500 rounded-full blur-3xl opacity-40 animate-pulse"></div>
              <img src={heroImg} alt="Hero" className="w-full h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </div>

      {activePromos.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">โปรโมชันเด็ด ✨</h2>
            <Link to="/promotions" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">ดูทั้งหมด &gt;</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {activePromos.map(promo => {
              const isCollected = myPromos.some(mp => mp.id === promo.id || mp.promotion_id === promo.id);
              return (
                <div key={promo.id} className="min-w-70 bg-linear-to-r from-orange-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg snap-center relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/20 rounded-full blur-2xl"></div>
                  {promo.shop_id && <span className="absolute top-2 right-3 text-[10px] font-bold bg-white/30 px-2 py-0.5 rounded-full">โค้ดร้านค้า</span>}
                  <h3 className="text-2xl font-black mb-1 drop-shadow-md">{promo.code}</h3>
                  <p className="text-sm font-medium mb-3 text-orange-50">{promo.description}</p>
                  <p className="text-xs mb-4 bg-slate-900/20 inline-block px-2 py-1 rounded">ขั้นต่ำ {promo.min_purchase.toLocaleString()}฿</p>
                  <button 
                    onClick={() => handleCollectPromo(promo.id)}
                    disabled={isCollected}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${isCollected ? 'bg-white/30 cursor-not-allowed text-white' : 'bg-white text-orange-600 hover:bg-orange-50 hover:scale-105'}`}
                  >
                    {isCollected ? 'เก็บแล้ว' : 'เก็บโค้ดเลย'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {carousels.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-10">
          <div className="relative w-full h-62.5 md:h-100 lg:h-112.5 rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {carousels.map((c, idx) => (
              <div key={c.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                {c.link_url ? (
                  <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
                    <img src={c.image_url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <img src={c.image_url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
            
            {carousels.length > 1 && (
              <>
                <button onClick={() => setCurrentSlide(prev => (prev - 1 + carousels.length) % carousels.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-slate-900/40 hover:bg-blue-600 backdrop-blur text-white w-10 h-10 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  &lt;
                </button>
                <button onClick={() => setCurrentSlide(prev => (prev + 1) % carousels.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-slate-900/40 hover:bg-blue-600 backdrop-blur text-white w-10 h-10 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  &gt;
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                  {carousels.map((_, idx) => (
                    <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2.5 h-2.5 rounded-full transition-all shadow-md ${idx === currentSlide ? 'bg-white scale-125 w-6' : 'bg-white/50 hover:bg-white'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            บทความ & เอกสารแนะนำ 📚
          </h2>
        </div>
        {documents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {documents.map(d => (
              <div key={d.id} className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="h-48 bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                  {d.cover_image ? 
                    <img src={d.cover_image} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/> : 
                    <div className="w-full h-full flex items-center justify-center"><span className="text-slate-400 font-bold">No Image</span></div>
                  }
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-black mb-4 text-slate-900 dark:text-white leading-snug line-clamp-2">{d.title}</h3>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                    <Link to={`/documents/${d.id}`} className="flex justify-center items-center w-full bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold py-3.5 rounded-xl transition-all duration-300">
                      อ่านเพิ่มเติม
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}