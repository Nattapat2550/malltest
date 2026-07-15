import React, { useState, useEffect, useRef } from 'react';
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

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new'>('new');
  const [newAddressTitle, setNewAddressTitle] = useState('ที่อยู่ใหม่');
  
  const [addrDetail, setAddrDetail] = useState(''); 
  const [addrSubdistrict, setAddrSubdistrict] = useState(''); 
  const [addrDistrict, setAddrDistrict] = useState(''); 
  const [addrProvince, setAddrProvince] = useState(''); 
  const [addrCountry, setAddrCountry] = useState('ประเทศไทย');

  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [shippingMethod, setShippingMethod] = useState('standard');
  const [note, setNote] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromo);
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [myPromos, setMyPromos] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/users/me/wallet')
      .then(res => setWalletBalance(res.data.balance || 0))
      .catch(console.error)
      .finally(() => setLoadingWallet(false));

    getUserAddresses().then(res => {
      const data = res.data;
      setAddresses(data);
      if (data.length > 0) {
        setSelectedAddressId(data[0].id);
      }
    }).catch(console.error);

    api.get('/api/users/promotions/active').then(res => setActivePromos(res.data)).catch(console.error);
    api.get('/api/users/promotions/my').then(res => setMyPromos(res.data)).catch(console.error);

    fetch('/thai_addresses.json')
      .then(res => res.json())
      .then(data => {
        const formatted = data.map((item: any) => ({
          subdistrict: item.district || item.tambon || item.subdistrict || '',
          district: item.amphoe || item.district || '',
          province: item.province || ''
        }));
        setAllAddresses(formatted);
      })
      .catch(err => console.error("โหลดข้อมูลตำบลล้มเหลว", err));

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressSearch = (keyword: string, field: 'subdistrict' | 'district' | 'province') => {
    if (field === 'subdistrict') setAddrSubdistrict(keyword);
    if (field === 'district') setAddrDistrict(keyword);
    if (field === 'province') setAddrProvince(keyword);

    if (!keyword || allAddresses.length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const filtered = allAddresses.filter(item => 
      item.subdistrict.includes(keyword) || 
      item.district.includes(keyword) || 
      item.province.includes(keyword)
    ).slice(0, 20); 

    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const selectAddressMatch = (item: any) => {
    setAddrSubdistrict(item.subdistrict);
    setAddrDistrict(item.district);
    setAddrProvince(item.province);
    setShowDropdown(false);
  };

  if (items.length === 0) {
    return <div className="min-h-screen flex justify-center items-center text-slate-900 "><h1 className="text-2xl font-bold">ไม่มีสินค้าในตะกร้า</h1></div>;
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const shippingCost = shippingMethod === 'express' ? 50 : 30;
  
  let discount = 0;
  let isPromoValid = false;
  let promoErrorMsg = '';

  const selectedPromo = activePromos.find(p => p.code === promoCode);
  if (promoCode && selectedPromo) {
      if (subtotal >= (selectedPromo.min_purchase || 0)) {
          isPromoValid = true;
          if (selectedPromo.discount_type === 'percent') {
              discount = subtotal * (selectedPromo.discount_value / 100);
              if (selectedPromo.max_discount && discount > selectedPromo.max_discount) discount = selectedPromo.max_discount;
          } else if (selectedPromo.discount_type === 'fixed') {
              discount = selectedPromo.discount_value;
          } else if (selectedPromo.discount_type === 'free_shipping') {
              discount = shippingCost;
          }
      } else {
          promoErrorMsg = `ขั้นต่ำ ${selectedPromo.min_purchase.toLocaleString()}฿`;
      }
  } else if (promoCode && !selectedPromo) {
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
      if (!addrDetail.trim() || !addrSubdistrict.trim() || !addrDistrict.trim() || !addrProvince.trim()) {
        return alert('กรุณากรอกที่อยู่ให้ครบถ้วน');
      }
      finalAddressString = `${addrDetail} ต.${addrSubdistrict} อ.${addrDistrict} จ.${addrProvince} ${addrCountry}`;
      
      try { await addUserAddress({ title: newAddressTitle, address: finalAddressString }); } catch (e) { console.error('Save address fail', e); }
    } else {
      const addrObj = addresses.find(a => a.id === selectedAddressId);
      finalAddressString = addrObj ? addrObj.address : '';
      if (!finalAddressString) return alert('กรุณาเลือกที่อยู่');
    }

    if (isInsufficientBalance) return alert('ยอดเงินใน Wallet ไม่เพียงพอ กรุณาเติมเงิน');

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
      
      alert('สั่งซื้อสินค้าสำเร็จ!');
      navigate('/settings'); 

    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-canvas  transition-colors duration-300 pt-8 pb-20 px-6 lg:px-12 2xl:px-20 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black text-slate-900  mb-10">ยืนยันคำสั่งซื้อ</h1>
      
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 flex flex-col gap-6">
          
          <div className="bg-white  rounded-md p-6 lg:p-8 shadow-sm border border-slate-200 ">
            <h2 className="text-xl font-black text-slate-900  mb-6">ที่อยู่จัดส่ง</h2>
            
            {addresses.length > 0 && (
              <div className="flex flex-col gap-3 mb-6">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex items-start gap-4 p-4 border-2 rounded-md cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50 /20' : 'border-slate-200 '}`}>
                    <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1" />
                    <div>
                      <p className="font-bold text-slate-900 ">{addr.title}</p>
                      <p className="text-sm text-slate-600  mt-1">{addr.address}</p>
                    </div>
                  </label>
                ))}
                
                <label className={`flex items-start gap-4 p-4 border-2 rounded-md cursor-pointer transition-all ${selectedAddressId === 'new' ? 'border-blue-600 bg-blue-50 /20' : 'border-slate-200 '}`}>
                  <input type="radio" name="address" checked={selectedAddressId === 'new'} onChange={() => setSelectedAddressId('new')} className="mt-1" />
                  <div className="font-bold text-slate-900 ">เพิ่มที่อยู่ใหม่...</div>
                </label>
              </div>
            )}

            {(selectedAddressId === 'new' || addresses.length === 0) && (
              <div className="space-y-5 animate-fade-in relative" ref={dropdownRef}>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">ชื่อเรียก (เช่น บ้าน, ที่ทำงาน)</label>
                  <input type="text" value={newAddressTitle} onChange={e => setNewAddressTitle(e.target.value)} className="w-full px-4 py-3 rounded-md border border-slate-200  bg-canvas  text-slate-900  outline-none" placeholder="บ้าน" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">บ้านเลขที่, ถนน, ซอย</label>
                  <input type="text" value={addrDetail} onChange={e => setAddrDetail(e.target.value)} placeholder="เลขที่ 123/45 หมู่ 1" className="w-full px-4 py-3 rounded-md border border-slate-200  bg-canvas  text-slate-900  outline-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700  mb-1">ตำบล/แขวง</label>
                    <input type="text" value={addrSubdistrict} onChange={e => handleAddressSearch(e.target.value, 'subdistrict')} placeholder="ค้นหาตำบล..." className="w-full px-4 py-3 rounded-md border border-slate-200  bg-canvas  text-slate-900  outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700  mb-1">อำเภอ/เขต</label>
                    <input type="text" value={addrDistrict} onChange={e => handleAddressSearch(e.target.value, 'district')} placeholder="ค้นหาอำเภอ..." className="w-full px-4 py-3 rounded-md border border-slate-200  bg-canvas  text-slate-900  outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700  mb-1">จังหวัด</label>
                    <input type="text" value={addrProvince} onChange={e => handleAddressSearch(e.target.value, 'province')} placeholder="ค้นหาจังหวัด..." className="w-full px-4 py-3 rounded-md border border-slate-200  bg-canvas  text-slate-900  outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700  mb-1">ประเทศ</label>
                    <input type="text" value={addrCountry} onChange={e => setAddrCountry(e.target.value)} className="w-full px-4 py-3 rounded-md border border-slate-200  bg-surface-soft  text-slate-900  outline-none" />
                  </div>
                </div>

                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white  border border-slate-200  rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => selectAddressMatch(item)}
                        className="px-4 py-3 hover:bg-surface-soft hover:text-primary dark:hover:bg-slate-700 dark:hover:text-blue-400 cursor-pointer text-sm text-slate-700  border-b border-slate-100  last:border-0"
                      >
                        {item.subdistrict} » {item.district} » {item.province}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white  rounded-md p-6 lg:p-8 shadow-sm border border-slate-200 ">
            <h2 className="text-xl font-black text-slate-900  mb-6">วิธีการจัดส่ง</h2>
            <div className="flex gap-4">
              <label className={`flex-1 border-2 p-4 rounded-md cursor-pointer transition-all ${shippingMethod === 'standard' ? 'border-blue-600 bg-blue-50 /20' : 'border-slate-200 '}`}>
                <input type="radio" name="shipping" value="standard" className="hidden" checked={shippingMethod === 'standard'} onChange={() => setShippingMethod('standard')} />
                <div className="font-bold text-slate-900 ">ส่งธรรมดา (30฿)</div>
                <div className="text-sm text-slate-500 mt-1">ได้รับภายใน 3-5 วัน</div>
              </label>
              <label className={`flex-1 border-2 p-4 rounded-md cursor-pointer transition-all ${shippingMethod === 'express' ? 'border-blue-600 bg-blue-50 /20' : 'border-slate-200 '}`}>
                <input type="radio" name="shipping" value="express" className="hidden" checked={shippingMethod === 'express'} onChange={() => setShippingMethod('express')} />
                <div className="font-bold text-slate-900 ">ส่งด่วน (50฿)</div>
                <div className="text-sm text-slate-500 mt-1">ได้รับภายใน 1-2 วัน</div>
              </label>
            </div>
          </div>

          <div className="bg-white  rounded-md p-6 lg:p-8 shadow-sm border border-slate-200 ">
            <h2 className="text-xl font-black text-slate-900  mb-6">หมายเหตุ (ถ้ามี)</h2>
            <textarea 
              rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="ข้อความถึงผู้จัดส่ง..."
              className="w-full px-5 py-4 rounded-md border border-slate-200  bg-canvas  text-slate-900  focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
          </div>

        </div>

        <div className="lg:w-112.5 flex flex-col gap-6">
          <div className={`rounded-md p-6 shadow-sm border-2 ${isInsufficientBalance ? 'bg-red-50 /20 border-red-200 ' : 'bg-blue-50 /20 border-blue-200 '}`}>
            <h2 className={`text-lg font-bold mb-2 ${isInsufficientBalance ? 'text-red-800 ' : 'text-blue-900 '}`}>
              ยอดเงินใน Wallet
            </h2>
            {loadingWallet ? (
              <p className="text-slate-500">กำลังโหลด...</p>
            ) : (
              <div>
                <p className={`text-3xl font-black ${isInsufficientBalance ? 'text-red-600 ' : 'text-primary '}`}>
                  ฿ {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {isInsufficientBalance && (
                  <p className="text-sm text-red-600  mt-2 font-bold">
                    * ขาดอีก ฿{(total - walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white  rounded-md p-6 shadow-sm border border-slate-200 ">
            <h2 className="text-xl font-black text-slate-900  mb-6">สรุปคำสั่งซื้อ</h2>
            
            <div className="flex flex-col gap-4 max-h-75 overflow-y-auto pr-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 pb-4 border-b border-slate-100  last:border-0">
                  <div className="w-16 h-16 bg-surface-soft  rounded-sm overflow-hidden shrink-0">
                    {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900  text-sm line-clamp-1">{item.name}</h3>
                    <div className="text-xs text-slate-500 mt-1">จำนวน: {item.quantity}</div>
                  </div>
                  <div className="font-bold text-slate-900 ">฿{(item.price * item.quantity).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-slate-900  mb-3">โค้ดส่วนลด</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {myPromos.filter(p => !p.is_used).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => setPromoCode(p.code)} 
                    className={promoCode === p.code ? "px-3 py-1.5 text-xs font-bold rounded-md border transition-all bg-primary text-white border-blue-600 shadow-md" : "px-3 py-1.5 text-xs font-bold rounded-md border transition-all bg-white text-primary border-blue-200   hover:bg-canvas"}
                  >
                    {p.code}
                  </button>
                ))}
                {myPromos.filter(p => !p.is_used).length === 0 && <p className="text-xs text-slate-500">ไม่มีโค้ดในกระเป๋า</p>}
              </div>
              <input 
                type="text" placeholder="พิมพ์โค้ด เช่น NEWYEAR2024" 
                value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-md border border-slate-200  bg-canvas  text-slate-900  outline-none uppercase"
              />
              {promoCode && isPromoValid && <p className="text-green-500 text-sm mt-2 font-bold">ลดไป ฿{discount.toLocaleString()} บาท</p>}
              {promoCode && !isPromoValid && <p className="text-red-500 text-sm mt-2 font-bold">{promoErrorMsg}</p>}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100  flex flex-col gap-3">
              <div className="flex justify-between text-slate-600  font-medium">
                <span>ยอดรวมสินค้า</span><span>฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600  font-medium">
                <span>ค่าจัดส่ง</span><span>฿{shippingCost}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-500 font-medium">
                  <span>ส่วนลด</span><span>- ฿{discount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100 ">
                <span className="text-slate-900  font-bold">ยอดสุทธิ</span>
                <span className="text-3xl font-black text-primary ">฿{total.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              disabled={isInsufficientBalance || isSubmitting || loadingWallet}
              className={`w-full mt-8 py-4 rounded-md font-bold text-lg transition-all shadow-lg 
                ${isInsufficientBalance || isSubmitting || loadingWallet 
                  ? 'bg-slate-400  text-slate-200 cursor-not-allowed shadow-none' 
                  : 'bg-primary hover:bg-primary-active text-white shadow-blue-500/30'
                }`}
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : isInsufficientBalance ? 'ยอดเงินไม่พอ' : 'ชำระเงิน'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}