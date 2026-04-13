import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
// นำเข้า API service จาก api.ts ที่อัปเดตแล้ว

const ProductCatalog: React.FC = () => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // API.get('/products').then(res => setProducts(res.data));
  }, []);

  const handleBuy = (product: any) => {
    dispatch(addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    }));
  };

  return (
    <div className="catalog-container" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ color: 'var(--primary-color)' }}>Shopping Mall</h1>
      <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {/* จำลองการ Render สินค้า */}
        <div className="product-card" style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--card-bg)' }}>
          <h3>Sample Product</h3>
          <p>Description goes here</p>
          <p style={{ fontWeight: 'bold' }}>฿1,500.00</p>
          <button 
            onClick={() => handleBuy({ id: 1, name: 'Sample Product', price: 1500 })}
            style={{ backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;