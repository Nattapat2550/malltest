// frontend/src/pages/admin/tabs/OrdersTab.tsx
import React, { useState, useEffect } from 'react';
import api, { shipmentApi } from '../../../services/api';

interface Order {
 id: string; // เปลี่ยนจาก number เป็น string
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
 
 // Form State (Shipment / การจัดส่งย่อย) - เปลี่ยนให้เป็น string ทั้งหมด
 const [shipmentId, setShipmentId] = useState<string>('');
 const [shipmentStatus, setShipmentStatus] = useState('shipped_to_center');
 const [centerId, setCenterId] = useState<string>('');
 const [riderId, setRiderId] = useState<string>('');
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
 setShipmentId('');
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
 // อัปเดตสถานะพัสดุย่อย
 if (!shipmentId) return alert('กรุณาระบุ Shipment ID');
 
 await shipmentApi.updateStatus({
 shipment_id: shipmentId,
 status: shipmentStatus,
 center_id: centerId || undefined, // ไม่ครอบด้วย Number() แล้ว
 rider_id: riderId || undefined, // ไม่ครอบด้วย Number() แล้ว
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
 case 'pending': return 'bg-yellow-100 text-yellow-800 /30 ';
 case 'paid': return 'bg-blue-100 text-blue-800 /30 ';
 case 'shipped': return 'bg-purple-100 text-purple-800 /30 ';
 case 'completed': return 'bg-green-100 text-green-800 /30 ';
 case 'cancelled': return 'bg-red-100 text-red-800 /30 ';
 default: return 'bg-surface-soft text-ink ';
 }
 };

 if (loading) {
 return <div className="p-8 text-center text-muted ">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>;
 }

 return (
 <div className="bg-canvas rounded-md shadow-sm border border-hairline p-6">
 <h2 className="text-xl font-bold text-ink mb-6">จัดการคำสั่งซื้อและการจัดส่ง</h2>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-canvas /50 text-muted text-sm border-b border-hairline ">
 <th className="p-4">Order ID</th>
 <th className="p-4">User ID</th>
 <th className="p-4">ยอดรวม</th>
 <th className="p-4">สถานะหลัก</th>
 <th className="p-4 text-right">จัดการ</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-hairline ">
 {orders.length === 0 ? (
 <tr>
 <td colSpan={5} className="p-8 text-center text-muted ">
 ไม่มีข้อมูลคำสั่งซื้อ
 </td>
 </tr>
 ) : (
 orders.map(o => (
 <tr key={o.id} className="hover:bg-canvas dark:hover:bg-gray-750 transition-colors">
 <td className="p-4 font-mono text-ink text-xs">{o.id}</td>
 <td className="p-4 font-mono text-muted text-xs">{o.user_id}</td>
 <td className="p-4 font-medium text-primary ">
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
 className="px-4 py-2 bg-blue-50 text-primary hover:bg-blue-100 /30 dark:hover:bg-blue-900/50 rounded-sm text-sm font-bold transition-colors"
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

 {updateModal && selectedOrder && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/50 backdrop-blur-sm p-4">
 <div className="bg-canvas rounded-md w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-bold text-ink mb-2 break-all">อัปเดตคำสั่งซื้อ #{selectedOrder.id}</h3>
 
 <div className="flex gap-2 mb-6 bg-surface-soft p-1 rounded-md">
 <button type="button" onClick={()=>setUpdateType('order')} className={`flex-1 py-2 text-sm font-bold rounded-sm ${updateType === 'order' ? 'bg-canvas shadow-sm' : 'text-muted'}`}>
 ออเดอร์หลัก
 </button>
 <button type="button" onClick={()=>setUpdateType('shipment')} className={`flex-1 py-2 text-sm font-bold rounded-sm ${updateType === 'shipment' ? 'bg-canvas shadow-sm text-primary' : 'text-muted'}`}>
 พัสดุ (Owner/Center/Rider)
 </button>
 </div>
 
 <form onSubmit={handleUpdate} className="space-y-4">
 
 {updateType === 'order' ? (
 <div>
 <label className="block text-sm font-bold text-ink mb-1">สถานะหลักของ Order</label>
 <select 
 value={newStatus} 
 onChange={e => setNewStatus(e.target.value)}
 className="w-full px-4 py-3 border border-hairline rounded-md bg-canvas text-ink "
 >
 <option value="pending">Pending (รอชำระเงิน/รอดำเนินการ)</option>
 <option value="paid">Paid (ชำระเงินแล้ว)</option>
 <option value="shipped">Shipped (กำลังจัดส่ง)</option>
 <option value="completed">Completed (จัดส่งสำเร็จ)</option>
 <option value="cancelled">Cancelled (ยกเลิก)</option>
 </select>
 </div>
 ) : (
 <div className="space-y-4 bg-blue-50/50 /10 p-4 border border-blue-100 rounded-md">
 <div>
 <label className="block text-sm font-bold text-ink mb-1">รหัสพัสดุร้านค้า (Shipment ID)</label>
 {/* เปลี่ยน type="number" เป็น type="text" */}
 <input type="text" value={shipmentId} onChange={e=>setShipmentId(e.target.value)} required className="w-full px-4 py-2 border rounded-md text-ink " />
 </div>
 <div>
 <label className="block text-sm font-bold text-ink mb-1">ปรับสถานะพัสดุนี้เป็น</label>
 <select value={shipmentStatus} onChange={e=>setShipmentStatus(e.target.value)} className="w-full px-4 py-2 border rounded-md text-ink ">
 <option value="shipped_to_center">ส่งต่อให้ศูนย์จัดส่ง (Owner/Center)</option>
 <option value="at_center">รับเข้าศูนย์แล้ว (Center)</option>
 <option value="delivering">จ่ายงานให้ Rider (Center)</option>
 <option value="completed">จัดส่งสำเร็จ (Rider)</option>
 <option value="cancelled">ยกเลิกพัสดุ (Owner)</option>
 </select>
 </div>
 
 {shipmentStatus === 'shipped_to_center' && (
 <div>
 <label className="block text-sm font-bold text-ink mb-1">รหัสศูนย์เป้าหมาย (Center ID)</label>
 {/* เปลี่ยน type="number" เป็น type="text" */}
 <input type="text" value={centerId} onChange={e=>setCenterId(e.target.value)} required className="w-full px-4 py-2 border rounded-md text-ink " />
 </div>
 )}

 {shipmentStatus === 'delivering' && (
 <div>
 <label className="block text-sm font-bold text-ink mb-1">รหัสผู้ส่ง/ไรเดอร์ (Rider ID)</label>
 {/* เปลี่ยน type="number" เป็น type="text" */}
 <input type="text" value={riderId} onChange={e=>setRiderId(e.target.value)} required className="w-full px-4 py-2 border rounded-md text-ink " />
 </div>
 )}
 </div>
 )}

 <hr className="border-hairline my-4" />
 
 <h4 className="font-bold text-ink text-sm">การแจ้งเตือนผู้ซื้อ (Tracking Text)</h4>
 
 <div>
 <label className="block text-sm font-medium text-ink mb-1">รายละเอียด</label>
 <input 
 type="text" value={trackingDetail} onChange={e => setTrackingDetail(e.target.value)} 
 placeholder="เช่น สินค้าถึงศูนย์คัดแยกแล้ว" required
 className="w-full px-4 py-3 border border-hairline rounded-md bg-canvas text-ink "
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink mb-1">สถานที่อัปเดต (ถ้ามี)</label>
 <input 
 type="text" value={locationStr} onChange={e => setLocationStr(e.target.value)} 
 placeholder="เช่น ศูนย์คัดแยกสินค้า จ.สมุทรปราการ" required
 className="w-full px-4 py-3 border border-hairline rounded-md bg-canvas text-ink "
 />
 </div>
 
 <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-hairline ">
 <button type="button" onClick={() => setUpdateModal(false)} className="px-4 py-2 rounded-md bg-surface-soft hover:bg-surface-soft font-bold">
 ยกเลิก
 </button>
 <button type="submit" className="px-6 py-2 rounded-md bg-primary hover:bg-primary-active text-white font-bold shadow-md">
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