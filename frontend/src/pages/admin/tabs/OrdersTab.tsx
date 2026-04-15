// frontend/src/pages/admin/tabs/OrdersTab.tsx
import React, { useState, useEffect } from 'react';
import api, { shipmentApi } from '../../../services/api';

interface Order {
  id: number;
  user_id: string;
  total_amount: number;
  status: string;
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [updateModal, setUpdateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Tab ควบคุมใน Modal ว่าจะอัปเดต Order หลัก หรือ อัปเดต Shipment
  const [updateType, setUpdateType] = useState<'order' | 'shipment'>('order');

  // Form State (Order หลัก)
  const [newStatus, setNewStatus] = useState('pending');
  
  // Form State (Shipment / การจัดส่งย่อย)
  const [shipmentId, setShipmentId] = useState<number>(0);
  const [shipmentStatus, setShipmentStatus] = useState('shipped_to_center');
  const [centerId, setCenterId] = useState<number | ''>('');
  const [riderId, setRiderId] = useState<number | ''>('');
  const [trackingDetail, setTrackingDetail] = useState('');
  const [locationStr, setLocationStr] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/orders');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openUpdateModal = (order: Order) => {
    setSelectedOrder(order);
    setUpdateType('order');
    setNewStatus(order.status);
    
    // Clear Shipment states
    setShipmentId(0);
    setCenterId('');
    setRiderId('');
    setTrackingDetail('');
    setLocationStr('');
    
    setUpdateModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    try {
      if (updateType === 'order') {
        // อัปเดตสถานะออเดอร์หลัก
        await api.put(`/api/admin/orders/${selectedOrder.id}/status`, {
          status: newStatus,
          status_detail: trackingDetail,
          location: locationStr
        });
      } else {
        // อัปเดตสถานะพัสดุย่อย (รองรับ Owner, Center, Rider)
        if (!shipmentId) return alert('กรุณาระบุ Shipment ID');
        
        await shipmentApi.updateStatus({
          shipment_id: shipmentId,
          status: shipmentStatus,
          center_id: centerId ? Number(centerId) : undefined,
          rider_id: riderId ? Number(riderId) : undefined,
          tracking_detail: trackingDetail,
          location: locationStr
        });
      }
      
      setUpdateModal(false);
      fetchOrders(); 
      alert('อัปเดตข้อมูลสำเร็จ');
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดต หรือไม่มีสิทธิ์ทำรายการ');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'paid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">จัดการคำสั่งซื้อและการจัดส่ง</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
              <th className="p-4">Order ID</th>
              <th className="p-4">User ID</th>
              <th className="p-4">ยอดรวม</th>
              <th className="p-4">สถานะหลัก</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  ไม่มีข้อมูลคำสั่งซื้อ
                </td>
              </tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="p-4 font-bold text-gray-900 dark:text-white">#{o.id}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{o.user_id}</td>
                  <td className="p-4 font-medium text-blue-600 dark:text-blue-400">
                    ฿{o.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(o.status)}`}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end">
                    <button 
                      onClick={() => openUpdateModal(o)} 
                      className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-sm font-bold transition-colors"
                    >
                      อัปเดตการจัดส่ง
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal อัปเดตสถานะและเพิ่ม Tracking แบบแยก Role */}
      {updateModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">อัปเดตคำสั่งซื้อ #{selectedOrder.id}</h3>
            
            {/* สลับหน้าจอใน Modal */}
            <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
              <button type="button" onClick={()=>setUpdateType('order')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${updateType === 'order' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                ออเดอร์หลัก
              </button>
              <button type="button" onClick={()=>setUpdateType('shipment')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${updateType === 'shipment' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}>
                พัสดุ (Owner/Center/Rider)
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              
              {updateType === 'order' ? (
                // 1. อัปเดตออเดอร์หลัก (ระบบเดิมของ Admin)
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">สถานะหลักของ Order</label>
                  <select 
                    value={newStatus} 
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="pending">Pending (รอชำระเงิน/รอดำเนินการ)</option>
                    <option value="paid">Paid (ชำระเงินแล้ว)</option>
                    <option value="shipped">Shipped (กำลังจัดส่ง)</option>
                    <option value="completed">Completed (จัดส่งสำเร็จ)</option>
                    <option value="cancelled">Cancelled (ยกเลิก)</option>
                  </select>
                </div>
              ) : (
                // 2. อัปเดตพัสดุย่อยตาม Roles 
                <div className="space-y-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-800 rounded-xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสพัสดุร้านค้า (Shipment ID)</label>
                    <input type="number" value={shipmentId || ''} onChange={e=>setShipmentId(Number(e.target.value))} required className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ปรับสถานะพัสดุนี้เป็น</label>
                    <select value={shipmentStatus} onChange={e=>setShipmentStatus(e.target.value)} className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white">
                      <option value="shipped_to_center">ส่งต่อให้ศูนย์จัดส่ง (Owner/Center)</option>
                      <option value="at_center">รับเข้าศูนย์แล้ว (Center)</option>
                      <option value="delivering">จ่ายงานให้ Rider (Center)</option>
                      <option value="completed">จัดส่งสำเร็จ (Rider)</option>
                      <option value="cancelled">ยกเลิกพัสดุ (Owner)</option>
                    </select>
                  </div>
                  
                  {shipmentStatus === 'shipped_to_center' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสศูนย์เป้าหมาย (Center ID)</label>
                      <input type="number" value={centerId} onChange={e=>setCenterId(Number(e.target.value))} required className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  )}

                  {shipmentStatus === 'delivering' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสผู้ส่ง/ไรเดอร์ (Rider ID)</label>
                      <input type="number" value={riderId} onChange={e=>setRiderId(Number(e.target.value))} required className="w-full px-4 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  )}
                </div>
              )}

              <hr className="border-gray-200 dark:border-gray-700 my-4" />
              
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">การแจ้งเตือนผู้ซื้อ (Tracking Text)</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียด</label>
                <input 
                  type="text" value={trackingDetail} onChange={e => setTrackingDetail(e.target.value)} 
                  placeholder="เช่น สินค้าถึงศูนย์คัดแยกแล้ว" required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สถานที่อัปเดต (ถ้ามี)</label>
                <input 
                  type="text" value={locationStr} onChange={e => setLocationStr(e.target.value)} 
                  placeholder="เช่น ศูนย์คัดแยกสินค้า จ.สมุทรปราการ" required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setUpdateModal(false)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 font-bold">
                  ยกเลิก
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}