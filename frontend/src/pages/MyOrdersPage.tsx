import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  total_amount: number;
  status: string; // 'pending', 'shipping', 'completed', 'cancelled'
  created_at: string;
  items: OrderItem[];
}

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'รอการตรวจสอบ';
      case 'shipping': return 'กำลังจัดส่ง';
      case 'completed': return 'ส่งสำเร็จ';
      case 'cancelled': return 'ยกเลิกแล้ว';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">สถานะการสั่งซื้อและการจัดส่ง</h1>
      
      {orders.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow">ไม่มีรายการสั่งซื้อ</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">หมายเลขคำสั่งซื้อ: #{order.id}</p>
                  <p className="text-sm text-gray-500">วันที่: {new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="dark:text-gray-300">{item.product_name} x {item.quantity}</span>
                    <span className="font-medium dark:text-white">฿{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-bold dark:text-white">รวมทั้งสิ้น:</span>
                <span className="text-lg font-bold text-blue-600">฿{order.total_amount.toLocaleString()}</span>
              </div>
              
              {/* แสดง Progress Bar ตามสถานะ */}
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between text-xs">
                    <span className={order.status !== 'cancelled' ? 'text-blue-600' : 'text-red-600'}>
                      ความคืบหน้าการจัดส่ง
                    </span>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                    <div 
                      style={{ width: 
                        order.status === 'pending' ? '25%' : 
                        order.status === 'shipping' ? '60%' : 
                        order.status === 'completed' ? '100%' : '0%' 
                      }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${order.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'}`}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;