import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { ChevronRight, FileText, Tag, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { showAlert } from '../utils/sweetalert';
import heroImg from '../assets/hero.png';
import ideaImg from '../assets/idea.png';

interface Carousel { id: number; image_url: string; link_url: string; is_active: boolean; }
interface DocumentItem { id: number; title: string; cover_image: string; is_active: boolean; }

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function HomePage() {
  const { data: carouselsData, isLoading: isCarouselsLoading } = useSWR('/api/carousel', fetcher);
  const { data: documentsData, isLoading: isDocumentsLoading } = useSWR('/api/documents/list', fetcher);
  const { data: activePromosData, isLoading: isPromosLoading } = useSWR('/api/users/promotions/active', fetcher);
  const { data: myPromosData, mutate: mutateMyPromos } = useSWR('/api/users/promotions/my', fetcher);

  const carousels = carouselsData || [];
  const documents = documentsData || [];
  const activePromos = (activePromosData || []).slice(0, 4);
  const myPromos = myPromosData || [];

  const [currentSlide, setCurrentSlide] = useState(0);

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
      showAlert('สำเร็จ!', 'เก็บโค้ดส่วนลดสำเร็จ!', 'success');
      mutateMyPromos([...myPromos, { promotion_id: id, id }], false);
    } catch (err: any) {
      showAlert('ผิดพลาด', err.response?.data?.error || err.response?.data?.message || 'เก็บโค้ดไม่สำเร็จ', 'error');
    }
  };

  return (
    <div className="w-full overflow-x-hidden bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      <div className="relative bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden border-b border-gray-200 dark:border-gray-800">
        <div className="absolute inset-0 bg-linear-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black opacity-50"></div>
        <div className="w-full px-6 lg:px-12 2xl:px-20 py-24 lg:py-32 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left flex-1">
            <span className="inline-block py-1 px-4 rounded-full bg-black/5 dark:bg-white/10 text-sm font-semibold tracking-widest uppercase mb-6 border border-black/10 dark:border-white/20 text-gray-600 dark:text-gray-300">
              The Ultimate Experience
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold mb-6 leading-tight tracking-tighter">
              Unlock Your <br className="hidden md:block" />
              <span className="text-gray-400 dark:text-gray-500">Shopping</span> Journey
            </h1>
            <p className="text-lg md:text-2xl text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto md:mx-0 mb-10 tracking-tight">
              สัมผัสประสบการณ์การช็อปปิ้งที่ไร้ขีดจำกัด พร้อมโปรโมชันจัดเต็มตลอดปี สินค้าของแท้ 100% ส่งตรงถึงหน้าบ้านคุณ
            </p>
            <Link to="/products" className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black font-semibold py-4 px-10 rounded-full hover:scale-105 transition-transform duration-300">
              เริ่มช็อปเลย <ChevronRight size={20} />
            </Link>
          </div>
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative w-64 md:w-80 lg:w-96">
              <img src={heroImg} alt="Hero" className="w-full h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] transform hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </div>

      {isPromosLoading ? (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-6"></div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1,2,3,4].map(i => <div key={i} className="min-w-70 h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>)}
          </div>
        </div>
      ) : activePromos.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
               <Tag className="text-gray-400" size={32} /> โปรโมชันเด็ด
            </h2>
            <Link to="/promotions" className="text-gray-500 hover:text-black dark:hover:text-white font-medium flex items-center transition-colors">ดูทั้งหมด <ChevronRight size={20}/></Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {activePromos.map((promo: any) => {
              const isCollected = myPromos.some((mp: any) => mp.id === promo.id || mp.promotion_id === promo.id);
              return (
                <div key={promo.id} className="min-w-70 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 text-gray-900 dark:text-white shadow-sm snap-center relative overflow-hidden transition-transform hover:-translate-y-1">
                  {promo.shop_id && <span className="absolute top-4 right-4 text-xs font-semibold bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">โค้ดร้านค้า</span>}
                  <h3 className="text-3xl font-semibold mb-2 tracking-tight">{promo.code}</h3>
                  <p className="text-sm font-medium mb-4 text-gray-500 dark:text-gray-400">{promo.description}</p>
                  <p className="text-xs mb-5 bg-gray-200 dark:bg-gray-700 inline-block px-3 py-1.5 rounded-lg font-medium">ขั้นต่ำ {promo.min_purchase.toLocaleString()}฿</p>
                  <button 
                    onClick={() => handleCollectPromo(promo.id)}
                    disabled={isCollected}
                    className={`w-full py-3 rounded-full font-semibold text-sm transition-all shadow-sm ${isCollected ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-black dark:bg-white text-white dark:text-black hover:scale-105'}`}
                  >
                    {isCollected ? 'เก็บแล้ว' : 'เก็บโค้ดเลย'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCarouselsLoading ? (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-10">
           <div className="w-full h-62.5 md:h-100 lg:h-112.5 rounded-[2rem] bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
        </div>
      ) : carousels.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-10">
          <div className="relative w-full h-62.5 md:h-100 lg:h-112.5 rounded-[2rem] overflow-hidden shadow-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
            {carousels.map((c: any, idx: number) => (
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
                <button onClick={() => setCurrentSlide(prev => (prev - 1 + carousels.length) % carousels.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/50 hover:bg-white dark:bg-black/50 dark:hover:bg-black backdrop-blur-md text-black dark:text-white w-12 h-12 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => setCurrentSlide(prev => (prev + 1) % carousels.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/50 hover:bg-white dark:bg-black/50 dark:hover:bg-black backdrop-blur-md text-black dark:text-white w-12 h-12 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                  {carousels.map((_: any, idx: number) => (
                    <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2.5 h-2.5 rounded-full transition-all shadow-md ${idx === currentSlide ? 'bg-white scale-150 w-6' : 'bg-white/50 hover:bg-white'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isDocumentsLoading ? null : documents.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <FileText className="text-gray-600 dark:text-gray-300" size={28} />
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">
              บทความ & เอกสารแนะนำ
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {documents.map((d: any) => (
              <div key={d.id} className="group apple-glass rounded-[2rem] overflow-hidden flex flex-col h-full hover:shadow-2xl transition-all duration-300">
                <div className="h-48 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                  {d.cover_image ? 
                    <img src={d.cover_image} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/> : 
                    <div className="w-full h-full flex items-center justify-center"><span className="text-gray-400 font-medium">No Image</span></div>
                  }
                </div>
                <div className="p-6 flex flex-col flex-1 bg-white/50 dark:bg-black/50">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white leading-snug line-clamp-2 tracking-tight">{d.title}</h3>
                  <div className="mt-auto pt-4">
                    <Link to={`/documents/${d.id}`} className="flex justify-center items-center w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3.5 rounded-full transition-colors duration-300">
                      อ่านเพิ่มเติม
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}