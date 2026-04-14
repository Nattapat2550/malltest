import React, { useEffect, useState } from 'react';
import { adminGetAllOrders, adminUpdateOrderStatus } from '../../../services/api';

const OrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await adminGetAllOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await adminUpdateOrderStatus(orderId, newStatus);
      alert('อัปเดตสถานะสำเร็จ');
      fetchOrders(); // รีเฟรชข้อมูล
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  if (loading) return <div>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">จัดการคำสั่งซื้อ (Order Management)</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2">ID</th>
            <th className="p-2">User ID</th>
            <th className="p-2">Total</th>
            <th className="p-2">Status</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-b">
              <td className="p-2">#{o.id}</td>
              <td className="p-2 truncate max-w-xs">{o.user_id}</td>
              <td className="p-2">฿{o.total_amount.toLocaleString()}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  o.status === 'completed' ? 'bg-green-100 text-green-800' :
                  o.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                  o.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                }`}>
                  {o.status}
                </span>
              </td>
              <td className="p-2">
                <select 
                  className="border p-1 rounded"
                  value={o.status}
                  onChange={(e) => handleStatusChange(o.id, e.target.value)}
                >
                  <option value="pending">Pending (รอชำระ)</option>
                  <option value="paid">Paid (ชำระแล้ว)</option>
                  <option value="shipped">Shipped (กำลังจัดส่ง)</option>
                  <option value="completed">Completed (สำเร็จ)</option>
                  <option value="cancelled">Cancelled (ยกเลิก)</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTab;