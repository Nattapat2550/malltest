import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import api from '../services/api';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
}

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/products');
        setProducts(res.data || []);
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddToCart = (e: React.MouseEvent, p: Product) => {
    e.preventDefault(); // ป้องกันไม่ให้ Link ทำงานเมื่อกดปุ่มซื้อ
    if (p.stock > 0) {
      dispatch(addToCart({
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1,
        image_url: p.image_url,
        stock: p.stock
      }));
      // แจ้งเตือนผู้ใช้ (หรือใช้ Toast ถ้ามี)
      alert(`เพิ่ม ${p.name} ลงตะกร้าแล้ว`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pt-8 pb-20 px-6 lg:px-12 2xl:px-20 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            สินค้าทั้งหมด
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            เลือกซื้อสินค้าคุณภาพมากมายใน Mall ของเรา
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full relative">
            <input 
              type="text" 
              placeholder="ค้นหาสินค้าหรือ SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            />
            <svg className="w-5 h-5 absolute left-4 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button 
            onClick={() => navigate('/cart')}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-2xl shadow-md transition-all font-bold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            ตะกร้า
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-7xl mb-6">🛍️</div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">ไม่พบสินค้าที่คุณค้นหา</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">ลองค้นหาด้วยคำอื่น หรือสินค้าอาจจะหมดสต็อกชั่วคราว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(p => (
            <Link to={`/products/${p.id}`} key={p.id} className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
              
              <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="font-bold tracking-widest text-sm uppercase">NO IMAGE</span>
                  </div>
                )}
                
                {p.stock <= 0 ? (
                  <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-red-400/50">
                    สินค้าหมด
                  </div>
                ) : p.stock < 10 ? (
                  <div className="absolute top-4 left-4 bg-orange-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-orange-400/50">
                    ใกล้หมด ({p.stock} ชิ้น)
                  </div>
                ) : null}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-2 tracking-widest uppercase">{p.sku}</div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug">{p.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 line-clamp-2 leading-relaxed">
                  {p.description || 'ไม่มีคำอธิบายสำหรับสินค้านี้'}
                </p>
                
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-2xl font-black text-green-600 dark:text-green-400">
                    ฿{p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  
                  <button 
                    onClick={(e) => handleAddToCart(e, p)}
                    disabled={p.stock <= 0}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                      p.stock > 0 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}