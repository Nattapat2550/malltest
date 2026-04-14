import React, { useState, useEffect } from 'react';
import api from '../services/api'; // อ้างอิงจากโครงสร้างโปรเจกต์ของคุณ

// กำหนด Type ให้ TypeScript รู้จักข้อมูล
interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface TrackingStep {
  detail: string;
  location: string;
  time: string;
}

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [tracking, setTracking] = useState<TrackingStep[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // ดึงรายการคำสั่งซื้อตอนเปิดหน้า
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchTracking = async (orderId: number) => {
    setSelectedOrderId(orderId);
    setLoading(true);
    try {
      const response = await api.get(`/orders/${orderId}/tracking`);
      setTracking(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tracking:', error);
      setTracking([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">คำสั่งซื้อของฉัน</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* คอลัมน์ซ้าย: รายการคำสั่งซื้อ */}
        <div className="w-full md:w-1/2 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">ประวัติการสั่งซื้อ</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">คุณยังไม่มีคำสั่งซื้อ</p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li 
                  key={order.id} 
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 transition ${selectedOrderId === order.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => fetchTracking(order.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Order #{order.id}</span>
                    <span className="text-sm font-bold text-blue-600">฿{order.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex justify-between">
                    <span>สถานะ: {order.status}</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* คอลัมน์ขวา: สถานะการจัดส่ง (Tracking) */}
        <div className="w-full md:w-1/2 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">สถานะการจัดส่ง {selectedOrderId && `(Order #${selectedOrderId})`}</h2>
          
          {!selectedOrderId ? (
            <p className="text-gray-500 text-center mt-10">คลิกที่คำสั่งซื้อเพื่อดูสถานะการจัดส่ง</p>
          ) : loading ? (
            <p className="text-center text-gray-500 mt-10">กำลังโหลด...</p>
          ) : tracking.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">ยังไม่มีข้อมูลการจัดส่งสำหรับสินค้านี้</p>
          ) : (
            <div className="mt-6">
              {tracking.map((step, index) => (
                <div key={index} className="flex gap-4 mb-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    {index !== tracking.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1"></div>}
                  </div>
                  <div className="pb-4">
                    <p className={`font-bold ${index === 0 ? 'text-gray-900' : 'text-gray-600'}`}>{step.detail}</p>
                    <p className="text-sm text-gray-500">
                      {step.location && <span className="mr-2">{step.location} |</span>}
                      {new Date(step.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrdersPage;