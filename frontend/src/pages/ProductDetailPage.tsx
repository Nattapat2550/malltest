import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import api from '../services/api';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Carousel State
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // ดึงข้อมูลสินค้าปัจจุบัน
        const res = await api.get(`/api/products`);
        const allProducts = res.data || [];
        const current = allProducts.find((p: any) => p.id.toString() === id);
        
        if (current) {
          // Mock Media (ใส่ image_url หรือ video เพื่อจำลอง Carousel)
          current.media = [
            { type: 'image', url: current.image_url },
            { type: 'image', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80' },
            { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
          ];
          setProduct(current);
          
          // สุ่มสินค้าแนะนำ (จำลอง)
          setRelated(allProducts.filter((p: any) => p.id.toString() !== id).slice(0, 4));
        }
      } catch (err) {
        console.error("Error fetching product", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  const handleAddToCart = () => {
    if (!product || product.stock < 1) return;
    dispatch(addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image_url: product.image_url,
      stock: product.stock
    }));
    alert('เพิ่มลงตะกร้าเรียบร้อยแล้ว');
  };

  const handleBuyNow = () => {
    if (!product || product.stock < 1) return;
    // ส่งข้อมูลไปหน้า Checkout ผ่าน state (bypass cart)
    navigate('/checkout', { state: { 
      directBuy: [{
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image_url: product.image_url,
        stock: product.stock
      }]
    }});
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-900 dark:text-white"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div></div>;
  if (!product) return <div className="min-h-screen flex flex-col items-center justify-center text-gray-900 dark:text-white"><h1 className="text-3xl font-bold">ไม่พบสินค้านี้</h1><button onClick={() => navigate('/products')} className="mt-4 text-blue-500">กลับไปหน้าสินค้า</button></div>;

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pt-8 pb-20 px-6 lg:px-12 2xl:px-20">
      <button onClick={() => navigate('/products')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        กลับไปหน้าสินค้า
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200 dark:border-gray-700">
        
        {/* 1. Carousel Section */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full h-96 lg:h-125 bg-gray-100 dark:bg-gray-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {product.media[activeMediaIndex].type === 'video' ? (
              <video src={product.media[activeMediaIndex].url} controls className="w-full h-full object-contain" />
            ) : (
              <img src={product.media[activeMediaIndex].url} alt="Media" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {product.media.map((media: any, index: number) => (
              <div 
                key={index} 
                onClick={() => setActiveMediaIndex(index)}
                className={`w-24 h-24 shrink-0 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${activeMediaIndex === index ? 'border-blue-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                {media.type === 'video' ? (
                   <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                ) : (
                  <img src={media.url} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Product Details Section */}
        <div className="flex flex-col">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase mb-2">SKU: {product.sku}</div>
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-4">{product.name}</h1>
          <div className="text-4xl font-black text-green-600 dark:text-green-400 mb-6">฿{product.price.toLocaleString()}</div>
          
          <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            {product.description}
          </div>

          <div className="mb-8">
            <span className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">จำนวน</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors">-</button>
                <span className="px-4 py-2 font-bold text-gray-900 dark:text-white min-w-12 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors">+</button>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">มีสินค้าทั้งหมด {product.stock} ชิ้น</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <button 
              onClick={handleAddToCart}
              disabled={product.stock < 1}
              className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              เพิ่มลงตะกร้า
            </button>
            <button 
              onClick={handleBuyNow}
              disabled={product.stock < 1}
              className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              ซื้อทันที
            </button>
          </div>
        </div>
      </div>

      {/* 3. Review Section */}
      <div className="mt-16 bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">รีวิวจากผู้ใช้งาน (3)</h2>
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((rev) => (
            <div key={rev} className="border-b border-gray-100 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-2 text-yellow-400">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">คุณภาพดีมาก คุ้มราคา การจัดส่งรวดเร็ว</p>
              <div className="text-sm text-gray-500 dark:text-gray-400">ผู้ใช้ที่ไม่ได้ระบุชื่อ • 2 วันที่ผ่านมา</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Related Products Section */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8">สินค้าอื่นๆ ที่เกี่ยวข้อง</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {related.map(p => (
              <Link to={`/products/${p.id}`} key={p.id} className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:-translate-y-1.5 transition-all duration-300">
                <div className="h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">NO IMAGE</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{p.name}</h3>
                  <div className="text-green-600 dark:text-green-400 font-black">฿{p.price.toLocaleString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}