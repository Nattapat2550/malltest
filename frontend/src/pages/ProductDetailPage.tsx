import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import api from '../services/api';
import { ProductComments } from './ProductComments';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Carousel State
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  // State สำหรับเก็บตัวเลือกย่อย (แถวล่าง) ที่ผู้ใช้เลือก
  const [selectedSubVariant, setSelectedSubVariant] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/products`);
        const allProducts = res.data || [];
        const current = allProducts.find((p: any) => p.id.toString() === id);
        
        if (current) {
          // ฟังก์ชันช่วยหา Root ID ที่แท้จริง ป้องกันการดึงตัวเลือกของคนอื่นมาปน
          const getRootId = (prod: any) => {
            if (prod.parent_id && prod.parent_id !== "null" && prod.parent_id !== "undefined" && prod.parent_id !== "") {
                return prod.parent_id;
            }
            return prod.id;
          };
          
          const currentRootId = getRootId(current);
          const parentProduct = allProducts.find((p: any) => p.id === currentRootId);

          // ถ้าไม่มี media_urls หรือ image_url ของตัวเอง ให้ใช้ของ Mother ID
          let targetMediaUrls = current.media_urls;
          if ((!targetMediaUrls || targetMediaUrls === '[]' || targetMediaUrls === '') && current.parent_id) {
              if (parentProduct && parentProduct.media_urls) {
                  targetMediaUrls = parentProduct.media_urls;
              }
          }

          let parsedMedia = [];
          if (typeof targetMediaUrls === 'string') {
             try { parsedMedia = JSON.parse(targetMediaUrls); } catch(e) {}
          } else if (Array.isArray(targetMediaUrls)) {
             parsedMedia = targetMediaUrls;
          }

          let targetImageUrl = current.image_url;
          if (!targetImageUrl && current.parent_id) {
              if (parentProduct && parentProduct.image_url) {
                  targetImageUrl = parentProduct.image_url;
              }
          }

          current.media = parsedMedia.length > 0 
            ? parsedMedia 
            : [{ type: 'image', url: targetImageUrl }];
            
          setProduct(current);
          
          // ตั้งค่าตัวเลือกย่อย (แถวล่าง) อัตโนมัติเป็นตัวแรกสุด
          if (current.variant_value) {
             const vals = current.variant_value.split(',').map((s: string) => s.trim()).filter(Boolean);
             if (vals.length > 0) setSelectedSubVariant(vals[0]);
             else setSelectedSubVariant('');
          } else {
             setSelectedSubVariant('');
          }
          
          // ดึงตัวเลือกสินค้าเฉพาะที่อยู่ในกลุ่ม Root ID เดียวกันอย่างเข้มงวด
          const currentVariants = allProducts.filter((p: any) => getRootId(p) === currentRootId);
          setVariants(currentVariants);

          // แก้บัค 1: สุ่มสินค้าแนะนำ ต้องเป็นสินค้าคลาสแม่เท่านั้น (ไม่ให้คลาสลูกของสินค้าอื่นมาโผล่ที่นี่)
          setRelated(allProducts.filter((p: any) => {
            const isMotherProd = !p.parent_id || p.parent_id === "null" || p.parent_id === "undefined" || p.parent_id === "";
            return p.id.toString() !== id && getRootId(p) !== currentRootId && isMotherProd;
          }).slice(0, 4));
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

  const getFinalProductName = () => {
    return selectedSubVariant ? `${product.name} (${selectedSubVariant})` : product.name;
  };

  const handleAddToCart = () => {
    if (!product || product.stock < 1) return;
    dispatch(addToCart({
      productId: product.id,
      name: getFinalProductName(),
      price: product.price,
      quantity: quantity,
      image_url: product.image_url,
      stock: product.stock
    }));
    alert('เพิ่มลงตะกร้าเรียบร้อยแล้ว');
  };

  const handleBuyNow = () => {
    if (!product || product.stock < 1) return;
    navigate('/checkout', { state: { 
      directBuy: [{
        productId: product.id,
        name: getFinalProductName(),
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
            {product.media[activeMediaIndex]?.type === 'video' ? (
              <video src={product.media[activeMediaIndex].url} controls className="w-full h-full object-contain" />
            ) : (
              <img src={product.media[activeMediaIndex]?.url} alt="Media" className="w-full h-full object-cover" />
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
          
          <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {product.description}
          </div>

          {/* Variants Selector */}
          {(variants.length > 1 || product.variant_value) && (
             <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
               
               {/* แถวบน: เลือกรุ่น แม่/ลูก */}
               {variants.length > 1 && (
                 <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
                   <span className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                     รุ่น / รูปแบบสินค้า
                   </span>
                   <div className="flex flex-wrap gap-2">
                     {variants.map((v: any) => {
                       // แก้บัค 2: แสดงชื่อสินค้า (ตัวแม่ หรือ ตัวลูก) ตรงๆ โดยไม่ใส่ [หลัก] และไม่เอา variant_type (สี) มาโชว์
                       const displayName = v.name; 
                       
                       return (
                         <button 
                           key={`prod-${v.id}`} 
                           onClick={() => navigate(`/products/${v.id}`)}
                           className={`px-4 py-2 border rounded-lg font-medium transition-all ${
                             v.id === product.id 
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                              : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                           }`}
                         >
                           {displayName}
                         </button>
                       );
                     })}
                   </div>
                 </div>
               )}

               {/* แถวล่าง: รายละเอียดของตัวที่เลือกปัจจุบัน */}
               {product.variant_value && (
                 <div>
                   <span className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                     รายละเอียดสินค้า
                   </span>
                   <div className="flex flex-wrap gap-2">
                     {product.variant_value.split(',').map((s: string) => s.trim()).filter(Boolean).map((val: string, idx: number) => (
                       <button 
                         key={`val-${idx}`} 
                         onClick={() => setSelectedSubVariant(val)}
                         className={`px-4 py-2 border rounded-lg font-medium transition-all ${
                           selectedSubVariant === val 
                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm' 
                            : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                         }`}
                       >
                         {val}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

             </div>
          )}

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
              disabled={product.stock < 1 || (product.variant_value && !selectedSubVariant)}
              className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              เพิ่มลงตะกร้า
            </button>
            <button 
              onClick={handleBuyNow}
              disabled={product.stock < 1 || (product.variant_value && !selectedSubVariant)}
              className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              ซื้อทันที
            </button>
          </div>
        </div>
      </div>

      {/* ไปที่ร้านค้า Section */}
      {product.shop_id && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-2xl font-bold">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{product.shop?.name || 'จำหน่ายโดยร้านค้านี้'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">คลิกเพื่อดูสินค้าอื่นๆ หรือดูคะแนนรีวิวร้านค้า</p>
            </div>
          </div>
          <Link to={`/shop/${product.shop_id}`} className="px-6 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl font-bold transition-colors w-full md:w-auto text-center">
            ไปที่หน้าร้านค้า
          </Link>
        </div>
      )}

      {/* 3. Review Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200 dark:border-gray-700">
        <ProductComments productId={id || ''} />
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