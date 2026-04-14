import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface OrderItem {
  id: number;
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

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-black mb-8 dark:text-white">รายการสั่งซื้อของฉัน</h1>
      
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold dark:text-white">ออเดอร์ #{order.id}</p>
                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString('th-TH')}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-600 font-bold">฿{order.total_amount.toLocaleString()}</p>
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className="text-sm text-blue-500 hover:underline mt-1"
                >
                  ดูรายละเอียดสินค้า
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal แสดงรายละเอียดสินค้า */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">รายละเอียดออเดอร์ #{selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 mb-4 items-center">
                  <img src={item.image_url} alt={item.product_name} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                  <div className="flex-1">
                    <p className="font-bold text-sm dark:text-white line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-gray-500">จำนวน: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-sm dark:text-white">฿{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
              <span className="font-bold dark:text-white">ยอดรวมสุทธิ</span>
              <span className="text-xl font-black text-blue-600">฿{selectedOrder.total_amount.toLocaleString()}</span>
            </div>
            <button 
              onClick={() => setSelectedOrder(null)}
              className="w-full py-4 bg-gray-200 dark:bg-gray-700 font-bold dark:text-white hover:bg-gray-300 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;