import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';

import ideaImg from '../assets/idea.png';

interface Carousel {
  id: number;
  image_url: string;
  link_url: string;
  is_active: boolean;
}
interface DocumentItem {
  id: number;
  title: string;
  cover_image: string;
  is_active: boolean;
}

const LandingPage = () => {
  const { isAuthenticated, role } = useSelector((s: any) => s.auth);
  
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [carouselRes, docRes] = await Promise.all([
          api.get('/api/carousel').catch(() => ({ data: [] })), 
          api.get('/api/documents/list').catch(() => ({ data: [] }))
        ]);
        setCarousels(carouselRes.data || []);
        setDocuments(docRes.data || []);
      } catch (err) {
        console.error("Failed to load public data");
      }
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

  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin' : '/home'} replace />;
  }

  return (
    <div className="w-full min-h-screen bg-canvas  pb-20 transition-colors duration-300 overflow-x-hidden">
      
      {/* 1. Hero Section */}
      <div className="relative pt-20 pb-16 md:pt-24 md:pb-20 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6 drop-shadow-sm">
          Welcome to Mall
        </h1>
        <p className="text-lg md:text-xl text-slate-600  max-w-2xl mb-10 font-medium">
          แพลตฟอร์มอีคอมเมิร์ซที่รวมสินค้าคุณภาพและบริการขนส่งไว้ในที่เดียว
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <Link 
            to="/register" 
            className="flex-1 bg-primary hover:bg-primary-active text-white font-bold py-3.5 px-6 rounded-md shadow-lg shadow-blue-500/30 transition-all text-center"
          >
            สมัครสมาชิก
          </Link>
          <Link 
            to="/login" 
            className="flex-1 bg-white  border-2 border-slate-200  hover:border-primary dark:hover:border-primary text-slate-900  font-bold py-3 px-6 rounded-md shadow-sm transition-all text-center flex items-center justify-center"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      {/* 2. Carousel Section */}
      {carousels.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-4">
          <div className="relative w-full h-62.5 md:h-100 lg:h-112.5 rounded-md overflow-hidden shadow-xl bg-white  border border-slate-200 ">
            {carousels.map((c, idx) => (
              <div
                key={c.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
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
                <button onClick={() => setCurrentSlide(prev => (prev - 1 + carousels.length) % carousels.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-canvas/40 hover:bg-primary backdrop-blur text-white w-10 h-10 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  &lt;
                </button>
                <button onClick={() => setCurrentSlide(prev => (prev + 1) % carousels.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-canvas/40 hover:bg-primary backdrop-blur text-white w-10 h-10 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
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

      {/* 3. Documents Section */}
      {documents.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-primary/10 /20 rounded-md">
              <img src={ideaImg} className="w-6 h-6 object-contain dark:invert" alt="Documents" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900  tracking-tight">
              ข่าวสาร & เอกสาร
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {documents.map(d => (
              <div key={d.id} className="group bg-white  rounded-md shadow-sm overflow-hidden border border-slate-200  flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="h-48 bg-surface-soft  relative overflow-hidden">
                  {d.cover_image ? 
                    <img src={d.cover_image} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/> : 
                    <div className="w-full h-full flex items-center justify-center"><span className="text-slate-400 font-bold">No Image</span></div>
                  }
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-black mb-4 text-slate-900  leading-snug line-clamp-2">{d.title}</h3>
                  <div className="mt-auto pt-4 border-t border-slate-100 ">
                    <Link to={`/documents/${d.id}`} className="flex justify-center items-center w-full bg-surface-soft  hover:bg-blue-50 dark:hover:bg-slate-600 text-primary  font-bold py-3.5 rounded-md transition-all duration-300">
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
export default LandingPage;