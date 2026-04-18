import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ownerApi, shipmentApi } from '../../services/api';

export default function OwnerPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shop');
  
  // เพิ่มการรองรับ Description และ Banner URL
  const [shopInfo, setShopInfo] = useState({ id: '', name: '', description: '', banner_url: '' });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const [centerId, setCenterId] = useState('');
  const [trackingDetail, setTrackingDetail] = useState('');
  const [locationStr, setLocationStr] = useState('');

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      if (data.role !== 'owner' && data.role !== 'admin') {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        navigate('/settings');
      } else {
        fetchData();
      }
    }).catch(() => navigate('/login'));
  }, []);

  const fetchData = async () => {
    try {
      const shopRes = await ownerApi.getShop();
      if (shopRes.data.has_shop) setShopInfo(shopRes.data.shop);
      
      const prodRes = await ownerApi.getProducts();
      setProducts(prodRes.data || []);

      const orderRes = await ownerApi.getOrders();
      setOrders(orderRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveShopInfo = async (e: any) => {
    e.preventDefault();
    try {
      await ownerApi.updateShop({ 
        name: e.target.shop_name.value,
        description: e.target.description.value,
        banner_url: e.target.banner_url.value 
      });
      alert("บันทึกข้อมูลหน้าร้านสำเร็จ");
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleSaveProduct = async (e: any) => {
    e.preventDefault();
    try {
      // แปลง media_urls จาก Textarea (บรรทัดละ URL) ให้เป็น JSON Array
      const mediaList = e.target.media_urls.value.split('\n').filter((m: string) => m.trim() !== '');
      // แปลง URL ให้เป็น format ของระบบ media (ระบุภาพหรือวิดีโอ)
      const mediaJson = JSON.stringify(mediaList.map((url: string) => ({
        type: url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image',
        url: url.trim()
      })));

      const payload = {
        sku: e.target.sku.value,
        name: e.target.name.value,
        description: e.target.description.value,
        price: parseFloat(e.target.price.value),
        stock: parseInt(e.target.stock.value),
        image_url: e.target.image_url.value,
        media_urls: mediaJson,
        parent_id: e.target.parent_id.value || null,
        variant_type: e.target.variant_type.value || null,
        variant_value: e.target.variant_value.value || null
      };
      
      if (editingProduct) {
        await ownerApi.updateProduct(editingProduct.id, payload);
      } else {
        await ownerApi.createProduct(payload);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
      alert("บันทึกข้อมูลสำเร็จ");
    } catch (err) { alert("เกิดข้อผิดพลาด: SKU อาจจะซ้ำ"); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?")) {
      try {
        await ownerApi.deleteProduct(id);
        fetchData();
      } catch (err) { alert("ลบสินค้าไม่สำเร็จ"); }
    }
  };

  const handleUpdateShipment = async (e: any) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      await shipmentApi.updateStatus({
        shipment_id: selectedShipment.shipment_id,
        status: 'shipped_to_center',
        center_id: centerId || undefined,
        tracking_detail: trackingDetail,
        location: locationStr
      });
      setShowShipmentModal(false);
      fetchData();
      alert('ส่งพัสดุต่อให้ศูนย์จัดส่งสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped_to_center': return 'bg-blue-100 text-blue-800';
      case 'at_center': return 'bg-purple-100 text-purple-800';
      case 'delivering': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pt-8 pb-4 px-6 lg:px-12">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Seller Center</h1>
        <p className="text-gray-500 dark:text-gray-400">ร้าน: <span className="font-bold text-orange-500">{shopInfo.name || 'ยังไม่ตั้งชื่อร้าน'}</span></p>
        
        <div className="flex gap-4 mt-8 overflow-x-auto">
          {['shop', 'products', 'orders'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'shop' ? 'จัดการร้านค้า' : tab === 'products' ? 'คลังสินค้า' : 'ออเดอร์จากลูกค้า'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 lg:p-12">
        
        {activeTab === 'shop' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">ตกแต่งหน้าร้านค้า</h2>
            <form onSubmit={handleSaveShopInfo} className="max-w-xl space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อร้านค้า (แสดงบนเว็บ)</label>
                <input type="text" name="shop_name" required className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white" defaultValue={shopInfo.name} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รายละเอียดร้าน / สโลแกน</label>
                <textarea name="description" rows={3} className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white" defaultValue={shopInfo.description} placeholder="บอกเล่าเรื่องราวหรือจุดเด่นของร้าน..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Banner URL (รูปปกหน้าร้าน)</label>
                <input type="url" name="banner_url" className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white" defaultValue={shopInfo.banner_url} placeholder="https://..." />
                {shopInfo.banner_url && <img src={shopInfo.banner_url} alt="Banner Preview" className="mt-4 w-full h-32 object-cover rounded-xl shadow-inner border border-gray-200" />}
              </div>
              <button type="submit" className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md">บันทึกข้อมูลร้าน</button>
            </form>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">คลังสินค้าของคุณ</h2>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">+ เพิ่มสินค้า</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                    <th className="p-3">SKU</th>
                    <th className="p-3">สินค้า</th>
                    <th className="p-3">ประเภทตัวเลือก</th>
                    <th className="p-3">ราคา</th>
                    <th className="p-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {products.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">ไม่มีสินค้าในคลัง</td></tr> :
                    products.map(p => (
                      <tr key={p.id}>
                        <td className="p-3 text-gray-500 text-sm">
                          {p.sku}
                          {p.parent_id && <span className="block text-xs text-orange-500">Sub-product</span>}
                        </td>
                        <td className="p-3 font-bold dark:text-white flex items-center gap-3">
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-md object-cover bg-gray-100" /> {p.name}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                          {p.variant_type ? `${p.variant_type}: ${p.variant_value}` : '-'}
                        </td>
                        <td className="p-3 text-blue-600 font-bold">฿{p.price}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="mr-3 text-blue-500 hover:underline font-bold">แก้ไข</button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:underline font-bold">ลบ</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">ออเดอร์ของลูกค้าที่สั่งสินค้าร้านคุณ</h2>
            <div className="grid gap-4">
              {orders.length === 0 ? <p className="text-gray-500">ยังไม่มีออเดอร์</p> : 
                orders.map((o, idx) => (
                  <div key={idx} className="p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="font-bold dark:text-white mb-1">รหัสพัสดุ (Shipment ID): <span className="font-mono text-xs">{o.shipment_id}</span> <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(o.shipment_status)}`}>{o.shipment_status.toUpperCase()}</span></p>
                      <p className="text-sm text-gray-500 mb-3 font-mono">Order ID หลัก: #{o.order_id} | วันที่: {new Date(o.created_at).toLocaleString()}</p>
                      
                      <div className="space-y-1 mb-3">
                        {o.items?.map((item: any, i: number) => (
                          <div key={i} className="text-sm font-medium dark:text-gray-300">- {item.name} <span className="text-blue-500">(x{item.quantity})</span></div>
                        ))}
                      </div>
                      
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-sm dark:text-gray-400 border dark:border-gray-700">
                        <span className="font-bold text-gray-700 dark:text-gray-300">ที่อยู่จัดส่ง:</span> {o.address}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center shrink-0">
                      {o.shipment_status === 'pending' && (
                        <button onClick={() => { setSelectedShipment(o); setShowShipmentModal(true); }} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm">
                          ส่งให้ศูนย์กระจายสินค้า
                        </button>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold dark:text-white mb-4">{editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h3>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ข้อมูลหลัก */}
              <div className="space-y-4">
                <h4 className="font-bold text-blue-600 border-b pb-2">ข้อมูลหลัก</h4>
                <div><label className="block text-sm font-bold dark:text-gray-300 mb-1">SKU</label><input type="text" name="sku" required className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.sku} /></div>
                <div><label className="block text-sm font-bold dark:text-gray-300 mb-1">ชื่อสินค้า</label><input type="text" name="name" required className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.name} /></div>
                <div><label className="block text-sm font-bold dark:text-gray-300 mb-1">รายละเอียด</label><textarea name="description" required rows={3} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.description} /></div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className="block text-sm font-bold dark:text-gray-300 mb-1">ราคา (฿)</label><input type="number" name="price" step="0.01" required className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:text-white dark:border-gray-700" defaultValue={editingProduct?.price} /></div>
                  <div className="flex-1"><label className="block text-sm font-bold dark:text-gray-300 mb-1">สต็อก</label><input type="number" name="stock" required className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:text-white dark:border-gray-700" defaultValue={editingProduct?.stock} /></div>
                </div>
              </div>

              {/* การผูกตัวเลือก และ รูปภาพ */}
              <div className="space-y-4">
                <h4 className="font-bold text-orange-500 border-b pb-2">ตัวเลือกย่อยและรูปภาพ</h4>
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">Mother ID (ถ้าสินค้านี้เป็นตัวเลือกย่อย)</label>
                  <select name="parent_id" className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.parent_id || ""}>
                    <option value="">-- ไม่ใช่สินค้าตัวเลือก (เป็นสินค้าหลัก) --</option>
                    {products.filter(p => p.id !== editingProduct?.id && !p.parent_id).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold dark:text-gray-300 mb-1">ชนิดตัวเลือก</label>
                    <input type="text" name="variant_type" placeholder="เช่น สี, ขนาด" className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.variant_type} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold dark:text-gray-300 mb-1">ค่าตัวเลือก</label>
                    <input type="text" name="variant_value" placeholder="เช่น แดง, XL" className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.variant_value} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">URL รูปหลัก (ปก)</label>
                  <input type="url" name="image_url" required className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" defaultValue={editingProduct?.image_url} />
                </div>
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">สื่ออื่นๆ (Carousel / วิดีโอ)</label>
                  <p className="text-xs text-gray-500 mb-1">ใส่ URL รูปภาพ หรือวิดีโอ (บรรทัดละ 1 URL)</p>
                  <textarea 
                    name="media_urls" 
                    rows={3} 
                    className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white whitespace-pre" 
                    defaultValue={editingProduct?.media_urls ? JSON.parse(editingProduct.media_urls).map((m: any) => m.url).join('\n') : ''} 
                    placeholder="https://image1.jpg&#10;https://video1.mp4"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg font-bold">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md">บันทึกสินค้า</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal สถานะพัสดุ (เหมือนเดิม) */}
      {showShipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold dark:text-white mb-2">อัปเดตสถานะพัสดุ</h3>
            <p className="text-sm text-gray-500 mb-4 break-all">ส่งพัสดุรหัส #{selectedShipment?.shipment_id} ไปยังศูนย์จัดส่ง</p>
            <form onSubmit={handleUpdateShipment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">รหัสศูนย์เป้าหมาย (Center ID)</label>
                <input type="text" required value={centerId} onChange={e=>setCenterId(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" placeholder="กรอก Center ID (UUID)" />
              </div>
              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">ข้อความแจ้งลูกค้า</label>
                <input type="text" required value={trackingDetail} onChange={e=>setTrackingDetail(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" placeholder="เช่น ร้านจัดส่งสินค้าให้ขนส่งแล้ว" />
              </div>
              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">สถานที่อัปเดต</label>
                <input type="text" required value={locationStr} onChange={e=>setLocationStr(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" placeholder="ชื่อร้าน หรือ คลังร้าน" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowShipmentModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg font-bold">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold shadow-md">ยืนยันการส่งพัสดุ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}