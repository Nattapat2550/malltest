import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // รับ State จากตะกร้า หรือ ซื้อทันที
  const items = location.state?.directBuy || [];
  const initialPromo = location.state?.promoCode || '';
  const initialDiscount = location.state?.discount || 0;

  const [address, setAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [note, setNote] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromo);

  if (items.length === 0) {
    return <div className="min-h-screen flex justify-center items-center text-gray-900 dark:text-white"><h1 className="text-2xl font-bold">ไม่พบข้อมูลการสั่งซื้อ</h1></div>;
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const shippingCost = shippingMethod === 'express' ? 50 : 30;
  const discount = promoCode === 'MALL20' ? subtotal * 0.2 : 0;
  const total = subtotal + shippingCost - discount;

  const handlePlaceOrder = () => {
    if (!address.trim()) return alert('กรุณากรอกที่อยู่จัดส่ง');
    // ในโปรเจกต์จริงจะเรียก API สั่งซื้อที่นี่
    alert('สั่งซื้อสำเร็จ! ขอบคุณที่ใช้บริการ');
    navigate('/home');
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pt-8 pb-20 px-6 lg:px-12 2xl:px-20 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-10">การชำระเงิน</h1>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* ฟอร์มข้อมูลการจัดส่ง */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">ที่อยู่จัดส่ง</h2>
            <textarea 
              rows={3}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="บ้านเลขที่, ถนน, ซอย, จังหวัด, รหัสไปรษณีย์..."
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">ประเภทการจัดส่ง</h2>
            <div className="flex gap-4">
              <label className={`flex-1 border-2 p-4 rounded-2xl cursor-pointer transition-all ${shippingMethod === 'standard' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="shipping" value="standard" className="hidden" checked={shippingMethod === 'standard'} onChange={() => setShippingMethod('standard')} />
                <div className="font-bold text-gray-900 dark:text-white">ส่งธรรมดา (฿30)</div>
                <div className="text-sm text-gray-500 mt-1">ได้รับภายใน 3-5 วัน</div>
              </label>
              <label className={`flex-1 border-2 p-4 rounded-2xl cursor-pointer transition-all ${shippingMethod === 'express' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="shipping" value="express" className="hidden" checked={shippingMethod === 'express'} onChange={() => setShippingMethod('express')} />
                <div className="font-bold text-gray-900 dark:text-white">ส่งด่วน (฿50)</div>
                <div className="text-sm text-gray-500 mt-1">ได้รับภายใน 1-2 วัน</div>
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">คำอธิบาย/ข้อความถึงผู้ส่ง (ถ้ามี)</h2>
            <textarea 
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ระบุเพิ่มเติม เช่น โทรหาเมื่อถึง, ฝากไว้ที่ป้อมยาม..."
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
          </div>
        </div>

        {/* สรุปรายการสินค้า */}
        <div className="lg:w-112.5 flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">สินค้าที่สั่งซื้อ</h2>
            <div className="flex flex-col gap-4 max-h-75 overflow-y-auto pr-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden shrink-0">
                    {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.name}</h3>
                    <div className="text-xs text-gray-500 mt-1">จำนวน: {item.quantity}</div>
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">฿{(item.price * item.quantity).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">โค้ดส่วนลด</h3>
              <input 
                type="text" 
                placeholder="กรอกโค้ด เช่น MALL20" 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
              {promoCode === 'MALL20' && <p className="text-green-500 text-sm mt-2 font-bold">🎉 ลด 20% แล้ว</p>}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                <span>ยอดรวมสินค้า</span>
                <span>฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                <span>ค่าจัดส่ง</span>
                <span>฿{shippingCost}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-500 font-medium">
                  <span>ส่วนลด</span>
                  <span>-฿{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white font-bold">ยอดชำระสุทธิ</span>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">฿{total.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              className="w-full mt-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-all shadow-lg shadow-blue-500/30"
            >
              ยืนยันการสั่งซื้อ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}