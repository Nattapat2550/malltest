import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { removeFromCart, updateQuantity } from '../store/slices/cartSlice';

export default function CartPage() {
 const items = useSelector((state: any) => state.cart.items);
 const dispatch = useDispatch();
 const navigate = useNavigate();

 const [selectedItems, setSelectedItems] = useState<number[]>([]);
 const [promoCode, setPromoCode] = useState('');

 const toggleSelect = (productId: number) => {
 setSelectedItems(prev => 
 prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
 );
 };

 const selectAll = () => {
 if (selectedItems.length === items.length) {
 setSelectedItems([]);
 } else {
 setSelectedItems(items.map((i: any) => i.productId));
 }
 };

 const selectedData = items.filter((i: any) => selectedItems.includes(i.productId));
 const subtotal = selectedData.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
 const discount = promoCode === 'MALL20' ? subtotal * 0.2 : 0; // จำลองโปรโมชั่น
 const total = subtotal - discount;

 const handleCheckout = () => {
 if (selectedItems.length === 0) return alert('กรุณาเลือกสินค้าที่ต้องการสั่งซื้อ');
 navigate('/checkout', { state: { directBuy: selectedData, promoCode, discount } });
 };

 if (items.length === 0) {
 return (
 <div className="min-h-screen bg-canvas flex flex-col items-center justify-center py-20 px-4">
 <div className="text-7xl mb-6">🛒</div>
 <h2 className="text-2xl font-black text-ink mb-4">ตะกร้าสินค้าของคุณว่างเปล่า</h2>
 <button onClick={() => navigate('/products')} className="bg-primary hover:bg-primary-active text-white px-8 py-3 rounded-full font-bold shadow-md transition-all">ไปช้อปปิ้งกันเลย</button>
 </div>
 );
 }

 return (
 <div className="w-full min-h-screen bg-canvas transition-colors duration-300 pt-8 pb-20 px-6 lg:px-12 2xl:px-20 animate-fade-in">
 <h1 className="text-3xl md:text-4xl font-black text-ink mb-10">ตะกร้าสินค้า</h1>

 <div className="flex flex-col lg:flex-row gap-10">
 <div className="flex-1 bg-canvas rounded-md p-6 shadow-sm border border-hairline ">
 <div className="flex items-center gap-4 border-b border-hairline pb-4 mb-4">
 <input type="checkbox" className="w-5 h-5 cursor-pointer accent-blue-600" checked={selectedItems.length === items.length && items.length > 0} onChange={selectAll} />
 <span className="font-bold text-ink text-lg">เลือกสินค้าทั้งหมด</span>
 </div>

 <div className="flex flex-col gap-6">
 {items.map((item: any) => (
 <div key={item.productId} className="flex items-center gap-4 p-4 rounded-md border border-hairline hover:border-primary transition-colors">
 <input type="checkbox" className="w-5 h-5 cursor-pointer accent-blue-600" checked={selectedItems.includes(item.productId)} onChange={() => toggleSelect(item.productId)} />
 <div className="w-24 h-24 bg-surface-soft rounded-md overflow-hidden shrink-0">
 {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
 </div>
 <div className="flex-1">
 <h3 className="font-bold text-ink line-clamp-1">{item.name}</h3>
 <div className="text-green-600 font-bold mt-1">฿{item.price.toLocaleString()}</div>
 </div>
 <div className="flex flex-col items-end gap-3">
 <button onClick={() => dispatch(removeFromCart(item.productId))} className="text-red-500 hover:text-red-700 text-sm font-bold">ลบ</button>
 <div className="flex items-center border border-hairline rounded-sm overflow-hidden">
 <button onClick={() => dispatch(updateQuantity({productId: item.productId, quantity: Math.max(1, item.quantity - 1)}))} className="px-3 py-1 bg-canvas text-ink hover:bg-surface-soft dark:hover:bg-gray-700">-</button>
 <span className="px-3 py-1 bg-canvas text-ink min-w-10 text-center font-bold">{item.quantity}</span>
 <button onClick={() => dispatch(updateQuantity({productId: item.productId, quantity: Math.min(item.stock, item.quantity + 1)}))} className="px-3 py-1 bg-canvas text-ink hover:bg-surface-soft dark:hover:bg-gray-700">+</button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* สรุปยอด และ โค้ดส่วนลด */}
 <div className="lg:w-96 flex flex-col gap-6">
 <div className="bg-canvas rounded-md p-6 shadow-sm border border-hairline ">
 <h2 className="text-xl font-black text-ink mb-4">โค้ดส่วนลด</h2>
 <div className="flex gap-2">
 <input 
 type="text" 
 placeholder="กรอกโค้ด เช่น MALL20" 
 value={promoCode}
 onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
 className="flex-1 px-4 py-3 rounded-md border border-hairline bg-canvas text-ink focus:ring-2 focus:ring-blue-500 outline-none uppercase"
 />
 </div>
 {promoCode === 'MALL20' && <p className="text-green-500 text-sm mt-2 font-bold">🎉 โค้ดส่วนลดใช้งานได้! ลด 20%</p>}
 </div>

 <div className="bg-canvas rounded-md p-6 shadow-sm border border-hairline ">
 <h2 className="text-xl font-black text-ink mb-6">สรุปคำสั่งซื้อ</h2>
 <div className="flex justify-between mb-3 text-muted font-medium">
 <span>ยอดรวมสินค้า ({selectedItems.length} ชิ้น)</span>
 <span>฿{subtotal.toLocaleString()}</span>
 </div>
 {discount > 0 && (
 <div className="flex justify-between mb-3 text-green-500 font-medium">
 <span>ส่วนลด (MALL20)</span>
 <span>-฿{discount.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between items-end mt-6 pt-6 border-t border-hairline ">
 <span className="text-ink font-bold">ยอดสุทธิ</span>
 <span className="text-3xl font-black text-primary ">฿{total.toLocaleString()}</span>
 </div>
 <button 
 onClick={handleCheckout}
 disabled={selectedItems.length === 0}
 className="w-full mt-8 py-4 rounded-md bg-primary hover:bg-primary-active disabled:bg-gray-400 text-white font-bold text-lg transition-all shadow-lg shadow-blue-500/30 disabled:shadow-none"
 >
 ดำเนินการสั่งซื้อ
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}