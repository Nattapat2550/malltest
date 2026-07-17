import React, { useEffect, useState } from 'react';
import api, { commentApi } from '../services/api';

interface OrderItem { id: number; product_id: number; product_name: string; quantity: number; price: number; image_url: string; }
interface Order { id: number; total_amount: number; status: string; created_at: string; items: OrderItem[]; }
interface TrackingRecord { detail: string; location: string; time: string; }

const MyOrdersPage: React.FC = () => {
 const [orders, setOrders] = useState<Order[]>([]);
 const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
 const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
 const [trackingData, setTrackingData] = useState<TrackingRecord[]>([]);
 const [loadingTracking, setLoadingTracking] = useState(false);
 const [reviewModal, setReviewModal] = useState<{ isOpen: boolean, orderId: number, productId: number, productName: string } | null>(null);
 const [reviewForm, setReviewForm] = useState({ rating: 5, message: '' });

 const fetchOrders = async () => {
 try {
 const response = await api.get('/api/orders');
 setOrders(response.data);
 } catch (error) { console.error('Failed to fetch orders'); }
 };

 const fetchTracking = async (order: Order) => {
 setTrackingOrder(order);
 setLoadingTracking(true);
 try {
 const response = await api.get(`/api/orders/${order.id}/tracking`);
 setTrackingData(response.data || []);
 } catch (error) {
 console.error('Failed to fetch tracking data');
 setTrackingData([]);
 } finally {
 setLoadingTracking(false);
 }
 };

 const handleSubmitReview = async () => {
 if (!reviewModal || !reviewForm.message) {
 alert('กรุณากรอกข้อความรีวิว');
 return;
 }
 try {
 await commentApi.createComment(reviewModal.productId.toString(), {
 order_id: reviewModal.orderId.toString(), 
 rating: reviewForm.rating,
 message: reviewForm.message
 });
 alert('รีวิวสินค้าสำเร็จ!');
 setReviewModal(null);
 setReviewForm({ rating: 5, message: '' });
 } catch (error: any) {
 alert(error.response?.data || 'เกิดข้อผิดพลาดในการรีวิว');
 }
 };

 useEffect(() => { fetchOrders(); }, []);

 const getStatusColor = (status: string) => {
 switch (status.toLowerCase()) {
 case 'pending': case 'paid': return 'bg-yellow-100 text-yellow-800';
 case 'shipping': return 'bg-blue-100 text-blue-800';
 case 'completed': return 'bg-green-100 text-green-800';
 case 'cancelled': return 'bg-red-100 text-red-800';
 default: return 'bg-surface-soft text-ink';
 }
 };

 const getStatusText = (status: string) => {
 switch (status.toLowerCase()) {
 case 'pending': return 'รอการชำระเงิน';
 case 'paid': return 'ชำระเงินแล้ว/รอดำเนินการ';
 case 'shipping': return 'กำลังจัดส่ง';
 case 'completed': return 'สำเร็จแล้ว';
 case 'cancelled': return 'ยกเลิกแล้ว';
 default: return status;
 }
 };

 return (
 <div className="container mx-auto p-4 max-w-4xl min-h-screen">
 <h1 className="text-2xl lg:text-3xl font-black mb-6 ">คำสั่งซื้อของฉัน</h1>
 
 {orders.length === 0 ? (
 <div className="text-center p-8 bg-canvas rounded-sm shadow-sm border ">
 คุณยังไม่มีประวัติคำสั่งซื้อ
 </div>
 ) : (
 <div className="space-y-6">
 {orders.map((order) => (
 <div key={order.id} className="bg-canvas p-5 rounded-md shadow-sm border-2 border-blue-100 hover:border-blue-300 /30 dark:hover:border-blue-800 hover:shadow-md transition-all">
 
 <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
 <div>
 <p className="font-bold text-lg ">รหัสออเดอร์ #{order.id}</p>
 <p className="text-sm text-muted">สั่งเมื่อ: {new Date(order.created_at).toLocaleString('th-TH')}</p>
 </div>
 <span className={`px-4 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
 {getStatusText(order.status)}
 </span>
 </div>

 <div className="space-y-3 mb-4">
 {order.items?.map((item, idx) => (
 <div key={idx} className="flex justify-between items-center bg-canvas /30 p-2 rounded-md">
 <div className="flex items-center gap-3">
 <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded-sm" />
 <span className="text-sm font-medium ">{item.product_name}</span>
 </div>
 {order.status === 'completed' && (
 <button 
 onClick={() => setReviewModal({ isOpen: true, orderId: order.id, productId: item.product_id, productName: item.product_name })}
 className="text-xs bg-primary hover:bg-primary-active text-white px-3 py-1.5 rounded-sm transition-colors font-bold"
 >
 รีวิวสินค้า
 </button>
 )}
 </div>
 ))}
 </div>

 <div className="border-t pt-4 pb-2 flex justify-between items-center">
 <span className="font-bold text-ink ">ยอดรวม:</span>
 <span className="text-xl font-black text-primary ">{order.total_amount.toLocaleString()} ฿</span>
 </div>
 <div className="flex gap-3 mt-4">
 <button onClick={() => setSelectedOrder(order)} className="flex-1 py-2 px-4 bg-surface-soft text-ink rounded-md text-sm font-semibold">ดูรายละเอียด</button>
 <button onClick={() => fetchTracking(order)} className="flex-1 py-2 px-4 bg-blue-50 /30 text-primary rounded-md text-sm font-semibold border border-blue-200 ">ติดตามพัสดุ</button>
 </div>
 </div>
 ))}
 </div>
 )}

 {reviewModal && (
 <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
 <div className="bg-canvas w-full max-w-md rounded-md overflow-hidden shadow-2xl p-6">
 <h2 className="text-xl font-black mb-1 ">รีวิวสินค้า</h2>
 <p className="text-sm text-muted mb-6">{reviewModal.productName}</p>
 
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-bold mb-2 ">ให้คะแนน</label>
 <div className="flex gap-2">
 {[1,2,3,4,5].map(star => (
 <button 
 key={star}
 onClick={() => setReviewForm({...reviewForm, rating: star})}
 className={`text-2xl ${reviewForm.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
 >
 ★
 </button>
 ))}
 </div>
 </div>
 <div>
 <label className="block text-sm font-bold mb-2 ">ข้อความรีวิว</label>
 <textarea 
 className="w-full border rounded-md p-3 text-sm "
 rows={4}
 placeholder="เขียนรีวิวของคุณที่นี่..."
 value={reviewForm.message}
 onChange={e => setReviewForm({...reviewForm, message: e.target.value})}
 />
 </div>
 <div className="flex gap-3 pt-4">
 <button onClick={() => setReviewModal(null)} className="flex-1 py-3 text-muted font-bold">ยกเลิก</button>
 <button onClick={handleSubmitReview} className="flex-1 py-3 bg-primary text-white rounded-md font-bold shadow-lg shadow-blue-500/30">ยืนยันรีวิว</button>
 </div>
 </div>
 </div>
 </div>
 )}

 {selectedOrder && (
 <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-canvas w-full max-w-lg rounded-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
 <div className="p-6 border-b flex justify-between items-center bg-canvas ">
 <h2 className="text-xl font-bold ">รายการสินค้า (#{selectedOrder.id})</h2>
 <button onClick={() => setSelectedOrder(null)} className="text-muted text-3xl">&times;</button>
 </div>
 <div className="p-6 overflow-y-auto space-y-4">
 {selectedOrder.items?.map((item, idx) => (
 <div key={idx} className="flex gap-4 items-center bg-canvas /30 p-3 rounded-md">
 <img src={item.image_url} alt="" className="w-16 h-16 rounded-md object-cover border " />
 <div className="flex-1">
 <p className="font-bold text-sm ">{item.product_name}</p>
 <p className="text-xs text-muted">จำนวน: {item.quantity}</p>
 </div>
 <p className="font-black text-primary">{((item.price * item.quantity).toLocaleString())} ฿</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {trackingOrder && (
 <div className="fixed inset-0 bg-canvas/60 flex items-center justify-center z-50 p-4">
 <div className="bg-canvas w-full max-w-lg rounded-md p-6">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-xl font-bold ">สถานะการจัดส่งพัสดุ</h2>
 <button onClick={() => setTrackingOrder(null)} className="text-2xl">&times;</button>
 </div>
 {trackingData.length === 0 ? <p className="text-center py-10 text-muted">ไม่พบข้อมูลพัสดุ</p> : (
 <div className="space-y-6 border-l-2 border-blue-100 ml-2 pl-4">
 {trackingData.map((t, i) => (
 <div key={i} className="relative">
 <div className="absolute -left-6 w-3 h-3 bg-primary rounded-full"></div>
 <p className="font-bold text-sm ">{t.detail}</p>
 <p className="text-xs text-muted">{t.location} | {new Date(t.time).toLocaleString('th-TH')}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}

export default MyOrdersPage;