import React, { useEffect, useState } from 'react';
import api, { commentApi } from '../services/api';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  image_url: string;
}

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

interface TrackingRecord {
  detail: string;
  location: string;
  time: string;
}

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingRecord[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // --- State สำหรับระบบรีวิว ---
  const [reviewModal, setReviewModal] = useState<{ 
    isOpen: boolean, 
    orderId: number, 
    productId: number, 
    productName: string 
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, message: '' });

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders');
    }
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

  // ฟังก์ชันส่งรีวิว
  const handleSubmitReview = async () => {
    if (!reviewModal || !reviewForm.message) {
      alert('กรุณากรอกข้อความรีวิว');
      return;
    }
    try {
      await commentApi.createComment(reviewModal.productId, {
        order_id: reviewModal.orderId,
        rating: reviewForm.rating,
        message: reviewForm.message
      });
      alert('ส่งรีวิวสำเร็จ ขอบคุณสำหรับความคิดเห็นครับ!');
      setReviewModal(null);
      setReviewForm({ rating: 5, message: '' });
    } catch (error: any) {
      alert(error.response?.data || 'คุณได้รีวิวสินค้านี้ในคำสั่งซื้อนี้ไปแล้ว');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'paid': return 'bg-yellow-100 text-yellow-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'รอชำระเงิน';
      case 'paid': return 'ชำระเงินแล้ว/รอดำเนินการ';
      case 'shipping': return 'กำลังจัดส่ง';
      case 'completed': return 'จัดส่งสำเร็จ';
      case 'cancelled': return 'ยกเลิกแล้ว';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-black mb-6 dark:text-white">สถานะการสั่งซื้อและการจัดส่ง</h1>
      
      {orders.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 dark:text-gray-300">
          ไม่มีรายการสั่งซื้อ
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 border-y border-r dark:border-gray-700 hover:shadow-md transition-shadow">
              
              <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                <div>
                  <p className="font-bold text-lg dark:text-white">ออเดอร์ #{order.id}</p>
                  <p className="text-sm text-gray-500">วันที่: {new Date(order.created_at).toLocaleString('th-TH')}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              {/* รายการสินค้าในออเดอร์พร้อมปุ่มรีวิว */}
              <div className="space-y-3 mb-4">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                      <span className="text-sm font-medium dark:text-gray-200">{item.product_name}</span>
                    </div>
                    {order.status === 'completed' && (
                      <button 
                        onClick={() => setReviewModal({
                          isOpen: true,
                          orderId: order.id,
                          productId: item.product_id,
                          productName: item.product_name
                        })}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-bold"
                      >
                        รีวิวสินค้า
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t dark:border-gray-700 pt-4 pb-2 flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-gray-300">รวมทั้งสิ้น:</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">฿{order.total_amount.toLocaleString()}</span>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setSelectedOrder(order)} className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl text-sm font-semibold">รายละเอียด</button>
                <button onClick={() => fetchTracking(order)} className="flex-1 py-2 px-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-semibold border border-blue-200 dark:border-blue-800">ประวัติจัดส่ง</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Modal สำหรับเขียนรีวิว --- */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6">
            <h2 className="text-xl font-black mb-1 dark:text-white">รีวิวสินค้า</h2>
            <p className="text-sm text-gray-500 mb-6">{reviewModal.productName}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 dark:text-gray-300">คะแนนความพึงพอใจ</label>
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
                <label className="block text-sm font-bold mb-2 dark:text-gray-300">ความคิดเห็นของคุณ</label>
                <textarea 
                  className="w-full border dark:border-gray-600 rounded-2xl p-3 text-sm dark:bg-gray-900 dark:text-white"
                  rows={4}
                  placeholder="สินค้าเป็นอย่างไรบ้าง..."
                  value={reviewForm.message}
                  onChange={e => setReviewForm({...reviewForm, message: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setReviewModal(null)} className="flex-1 py-3 text-gray-500 font-bold">ยกเลิก</button>
                <button onClick={handleSubmitReview} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30">ส่งรีวิว</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal รายละเอียดสินค้าเดิม */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h2 className="text-xl font-bold dark:text-white">รายการสินค้า (#{selectedOrder.id})</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 text-3xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl">
                  <img src={item.image_url} alt="" className="w-16 h-16 rounded-xl object-cover border dark:border-gray-600" />
                  <div className="flex-1">
                    <p className="font-bold text-sm dark:text-white">{item.product_name}</p>
                    <p className="text-xs text-gray-500">จำนวน: {item.quantity}</p>
                  </div>
                  <p className="font-black text-blue-600">฿{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tracking เดิม */}
      {trackingOrder && (
        // ... (โค้ด Tracking เดิมของคุณ) ...
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-white">ประวัติจัดส่ง</h2>
                    <button onClick={() => setTrackingOrder(null)} className="text-2xl">&times;</button>
                </div>
                {/* Timeline Content */}
                {trackingData.length === 0 ? <p className="text-center py-10 text-gray-500">ไม่พบข้อมูล</p> : (
                    <div className="space-y-6 border-l-2 border-blue-100 ml-2 pl-4">
                        {trackingData.map((t, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-6 w-3 h-3 bg-blue-500 rounded-full"></div>
                                <p className="font-bold text-sm dark:text-white">{t.detail}</p>
                                <p className="text-xs text-gray-400">{t.location} • {new Date(t.time).toLocaleString('th-TH')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;