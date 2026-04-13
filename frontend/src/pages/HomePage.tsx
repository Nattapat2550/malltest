import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { apiService } from '../services/api';
import { addToCart, clearCart } from '../store/slices/cartSlice';
import { RootState } from '../store';
import ProductCard from '../components/ProductCard';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);

  useEffect(() => {
    apiService.getProducts().then(setProducts).catch(console.error);
  }, []);

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;
    const success = await apiService.checkout({
      user_id: 1, // Mock User ID สำหรับการทดสอบ
      items: cart.items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    });
    
    if (success) {
      alert('สั่งซื้อสำเร็จ! กำลังเข้าคิวประมวลผล');
      dispatch(clearCart());
    } else {
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Product Catalog</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '20px' }}>
        {products.map(p => (
          <ProductCard key={p.id} product={p} onAdd={() => dispatch(addToCart(p))} />
        ))}
      </div>
      
      {cart.totalItems > 0 && (
        <div style={{ marginTop: '40px', padding: '24px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
          <h3>Order Summary</h3>
          <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            Total Price: ฿{cart.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <button 
            onClick={handleCheckout} 
            style={{ backgroundColor: 'var(--success-color)', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '4px', width: '100%', fontSize: '1.1rem' }}
          >
            Confirm Checkout (Simulate Queue)
          </button>
        </div>
      )}
    </div>
  );
};
export default HomePage;