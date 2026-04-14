import React, { useEffect, useState } from 'react';
import api from '../services/api';

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
  
  // States สำหรับจัดการ Modal ทั้ง 2 แบบ
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  
  // States สำหรับข้อมูล Tracking
  const [trackingData, setTrackingData] = useState<TrackingRecord[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

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

              <div className="border-t dark:border-gray-700 pt-4 pb-2 flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-gray-300">รวมทั้งสิ้น:</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">฿{order.total_amount.toLocaleString()}</span>
              </div>
              
              {/* Progress Bar แสดงสถานะจัดส่ง */}
              <div className="mt-2 mb-6">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      style={{ width: 
                        (order.status === 'pending' || order.status === 'paid') ? '25%' : 
                        order.status === 'shipping' ? '60%' : 
                        order.status === 'completed' ? '100%' : '0%' 
                      }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${order.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'}`}
                    ></div>
                  </div>
                </div>
              </div>

              {/* ปุ่มการกระทำต่างๆ */}
              <div className="flex gap-3 border-t dark:border-gray-700 mt-4 pt-4">
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  รายละเอียดสินค้า
                </button>
                <button 
                  onClick={() => fetchTracking(order)}
                  className="flex-1 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-semibold transition-colors border border-blue-200 dark:border-blue-800"
                >
                  ประวัติการจัดส่ง
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal 1: แสดงรายละเอียดสินค้า (Items)                   */}
      {/* ---------------------------------------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h2 className="text-xl font-bold dark:text-white">รายการสินค้า (ออเดอร์ #{selectedOrder.id})</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.product_name} className="w-20 h-20 rounded-xl object-cover bg-white dark:bg-gray-800 border dark:border-gray-600" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">No Img</div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-sm lg:text-base dark:text-white line-clamp-2">{item.product_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">จำนวน: {item.quantity}</p>
                  </div>
                  <p className="font-black text-sm lg:text-base text-blue-600 dark:text-blue-400">฿{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal 2: แสดงประวัติการจัดส่ง (Tracking History Timeline) */}
      {/* ---------------------------------------------------- */}
      {trackingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h2 className="text-xl font-bold dark:text-white">ประวัติการจัดส่ง (#{trackingOrder.id})</h2>
              <button onClick={() => setTrackingOrder(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 dark:bg-gray-800">
              {loadingTracking ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
                </div>
              ) : trackingData.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                  <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  <p className="text-lg font-bold mb-1">ยังไม่มีประวัติ</p>
                  <p className="text-sm">กำลังรอผู้จัดส่งอัปเดตสถานะเข้าระบบ</p>
                </div>
              ) : (
                <div className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-900 ml-4 space-y-8 my-4">
                  {trackingData.map((track, idx) => (
                    <div key={idx} className="relative">
                      {/* วงกลมจุดบน Timeline (จุดแรกสุดเป็นสีน้ำเงินเข้มเพราะเป็นสถานะล่าสุด) */}
                      <div className={`absolute -left-6.25 w-4 h-4 rounded-full border-4 border-white dark:border-gray-800 ${idx === 0 ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                      
                      <div className="pl-4">
                        <p className={`font-bold text-lg ${idx === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                          {track.detail}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {/* Location Icon */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          <span>{track.location || 'ไม่ระบุสถานที่'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {/* Clock Icon */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          <span>{new Date(track.time).toLocaleString('th-TH')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;