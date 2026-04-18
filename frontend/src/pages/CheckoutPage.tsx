import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '../store/slices/cartSlice';
import api, { getUserAddresses, addUserAddress } from '../services/api';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const cartItems = useSelector((state: any) => state.cart.items);
  const items = location.state?.directBuy || cartItems;
  const initialPromo = location.state?.promoCode || '';

  // === Address State ===
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new'>('new');
  const [newAddressTitle, setNewAddressTitle] = useState('บ้าน');
  const [newAddressText, setNewAddressText] = useState('');
  
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [note, setNote] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromo);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === Promotion State ===
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [myPromos, setMyPromos] = useState<any[]>([]);

  useEffect(() => {
    // ดึง Wallet
    api.get('/api/users/me/wallet')
      .then(res => setWalletBalance(res.data.balance || 0))
      .catch(console.error)
      .finally(() => setLoadingWallet(false));

    // ดึงสมุดที่อยู่ (Address Book)
    getUserAddresses().then(res => {
      const data = res.data;
      setAddresses(data);
      if (data.length > 0) {
        setSelectedAddressId(data[0].id); // เลือกที่อยู่อันแรกเป็น Default
      }
    }).catch(console.error);

    // ดึงโปรโมชั่นที่ใช้งานได้และโปรโมชั่นที่เก็บไว้
    api.get('/api/users/promotions/active').then(res => setActivePromos(res.data)).catch(console.error);
    api.get('/api/users/promotions/my').then(res => setMyPromos(res.data)).catch(console.error);
  }, []);

  if (items.length === 0) {
    return <div className="min-h-screen flex justify-center items-center text-gray-900 dark:text-white"><h1 className="text-2xl font-bold">ไม่พบข้อมูลการสั่งซื้อ</h1></div>;
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const shippingCost = shippingMethod === 'express' ? 50 : 30;

  // === คำนวณส่วนลดจากโค้ดแบบ Dynamic (เช็คจาก Database) ===
  let discount = 0;
  let isPromoValid = false;
  let promoErrorMsg = '';

  const selectedPromo = activePromos.find(p => p.code === promoCode);
  if (promoCode && selectedPromo) {
      if (subtotal >= (selectedPromo.min_purchase || 0)) {
          isPromoValid = true;
          if (selectedPromo.discount_type === 'percent') {
              discount = subtotal * (selectedPromo.discount_value / 100);
              if (selectedPromo.max_discount && discount > selectedPromo.max_discount) {
                  discount = selectedPromo.max_discount;
              }
          } else if (selectedPromo.discount_type === 'fixed') {
              discount = selectedPromo.discount_value;
          } else if (selectedPromo.discount_type === 'free_shipping') {
              discount = shippingCost;
          }
      } else {
          promoErrorMsg = `ยอดซื้อขั้นต่ำไม่ถึง ฿${selectedPromo.min_purchase.toLocaleString()}`;
      }
  } else if (promoCode && !selectedPromo) {
      // ตรวจจับโค้ด MALL20 เป็น Fallback เดิมกรณี Backend ปิดอยู่ (หรือจะเอาออกก็ได้)
      if (promoCode === 'MALL20') {
         discount = subtotal * 0.2;
         isPromoValid = true;
      } else {
         promoErrorMsg = 'โค้ดไม่ถูกต้องหรือหมดอายุ';
      }
  }

  const total = subtotal + shippingCost - discount;
  const isInsufficientBalance = walletBalance < total;

  const handlePlaceOrder = async () => {
    let finalAddressString = '';

    if (selectedAddressId === 'new') {
      if (!newAddressText.trim()) return alert('กรุณากรอกที่อยู่จัดส่ง');
      finalAddressString = newAddressText;
      // บันทึกที่อยู่ใหม่เข้า Database ทันที
      try { await addUserAddress({ title: newAddressTitle, address: newAddressText }); } catch (e) { console.error('Save address fail', e); }
    } else {
      const addrObj = addresses.find(a => a.id === selectedAddressId);
      finalAddressString = addrObj ? addrObj.address : '';
      if (!finalAddressString) return alert('กรุณาเลือกที่อยู่จัดส่ง');
    }

    if (isInsufficientBalance) return alert('ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ');

    setIsSubmitting(true);
    try {
      const orderPayload = {
        items: items.map((item: any) => ({
          product_id: item.productId || item.id,
          quantity: item.quantity,
          price: item.price
        })),
        address: finalAddressString,
        shipping_method: shippingMethod,
        note,
        promo_code: isPromoValid ? promoCode : '',
        total_amount: total
      };

      await api.post('/api/orders/checkout', orderPayload);
      dispatch(clearCart());
      
      alert('สั่งซื้อสำเร็จ! หักยอดเงินเรียบร้อยแล้ว');
      navigate('/settings'); 
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pt-8 pb-20 px-6 lg:px-12 2xl:px-20 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-10">การชำระเงิน</h1>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 flex flex-col gap-6">
          
          {/* ส่วนของการเลือกที่อยู่ (Address Selection) */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">ที่อยู่จัดส่ง</h2>
            
            {addresses.length > 0 && (
              <div className="flex flex-col gap-3 mb-6">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{addr.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{addr.address}</p>
                    </div>
                  </label>
                ))}
                
                <label className={`flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedAddressId === 'new' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  <input type="radio" name="address" checked={selectedAddressId === 'new'} onChange={() => setSelectedAddressId('new')} className="mt-1" />
                  <div className="font-bold text-gray-900 dark:text-white">เพิ่มที่อยู่ใหม่...</div>
                </label>
              </div>
            )}

            {(selectedAddressId === 'new' || addresses.length === 0) && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ป้ายกำกับ (เช่น บ้าน, ที่ทำงาน)</label>
                  <input type="text" value={newAddressTitle} onChange={e => setNewAddressTitle(e.target.value)} className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none" placeholder="บ้าน" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รายละเอียดที่อยู่เต็ม</label>
                  <textarea rows={3} value={newAddressText} onChange={e => setNewAddressText(e.target.value)} placeholder="บ้านเลขที่, ถนน, ซอย, จังหวัด, รหัสไปรษณีย์..." className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                </div>
              </div>
            )}
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
              rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="ระบุเพิ่มเติม เช่น โทรหาเมื่อถึง, ฝากไว้ที่ป้อมยาม..."
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
          </div>
        </div>

        <div className="lg:w-112.5 flex flex-col gap-6">
          <div className={`rounded-3xl p-6 shadow-sm border-2 ${isInsufficientBalance ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
            <h2 className={`text-lg font-bold mb-2 ${isInsufficientBalance ? 'text-red-800 dark:text-red-400' : 'text-blue-900 dark:text-blue-300'}`}>
              ยอดเงินในกระเป๋าของคุณ
            </h2>
            {loadingWallet ? (
              <p className="text-gray-500">กำลังโหลด...</p>
            ) : (
              <div>
                <p className={`text-3xl font-black ${isInsufficientBalance ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  ฿{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {isInsufficientBalance && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-bold">
                    *ยอดเงินไม่เพียงพอ ขาดอีก ฿{(total - walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
          </div>

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
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">โค้ดส่วนลดของคุณ</h3>
              
              {/* โชว์ปุ่มโค้ดที่เก็บมา */}
              <div className="flex flex-wrap gap-2 mb-3">
                {myPromos.filter(p => !p.is_used).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => setPromoCode(p.code)} 
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${promoCode === p.code ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200'}`}
                  >
                    {p.code}
                  </button>
                ))}
                {myPromos.filter(p => !p.is_used).length === 0 && <p className="text-xs text-gray-500">ไม่มีโค้ดที่เก็บไว้</p>}
              </div>

              <input 
                type="text" placeholder="หรือกรอกโค้ด เช่น NEWYEAR2024" 
                value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none uppercase"
              />
              
              {/* ตรวจสอบโค้ด */}
              {promoCode && isPromoValid && <p className="text-green-500 text-sm mt-2 font-bold">🎉 โค้ดใช้งานได้ ลด {discount.toLocaleString()} บาท</p>}
              {promoCode && !isPromoValid && <p className="text-red-500 text-sm mt-2 font-bold">{promoErrorMsg}</p>}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                <span>ยอดรวมสินค้า</span><span>฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                <span>ค่าจัดส่ง</span><span>฿{shippingCost}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-500 font-medium">
                  <span>ส่วนลด</span><span>-฿{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white font-bold">ยอดชำระสุทธิ</span>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">฿{total.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              disabled={isInsufficientBalance || isSubmitting || loadingWallet}
              className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg 
                ${isInsufficientBalance || isSubmitting || loadingWallet
                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                }`}
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : isInsufficientBalance ? 'ยอดเงินไม่เพียงพอ' : 'ยืนยันการสั่งซื้อ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}