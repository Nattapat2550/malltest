// frontend/src/pages/admin/tabs/OrdersTab.tsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

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
  
  // Form State
  const [newStatus, setNewStatus] = useState('pending');
  const [statusDetail, setStatusDetail] = useState('');
  const [location, setLocation] = useState('');

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
    setNewStatus(order.status);
    setStatusDetail(''); // เคลียร์ค่าเก่าทุกครั้งที่เปิด
    setLocation('');
    setUpdateModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    try {
      await api.put(`/api/admin/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        status_detail: statusDetail,
        location: location
      });
      
      setUpdateModal(false);
      fetchOrders(); // โหลดข้อมูลใหม่
      alert('อัปเดตสถานะและประวัติการจัดส่งเรียบร้อยแล้ว');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปเดต');
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
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">จัดการคำสั่งซื้อ (Orders)</h2>

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
                      className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      อัปเดตสถานะ/การส่ง
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal อัปเดตสถานะและเพิ่ม Tracking */}
      {updateModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">อัปเดตคำสั่งซื้อ #{selectedOrder.id}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ผู้ซื้อ: {selectedOrder.user_id}</p>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              
              {/* 1. สถานะหลัก */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สถานะหลักของ Order</label>
                <select 
                  value={newStatus} 
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending (รอชำระเงิน/รอดำเนินการ)</option>
                  <option value="paid">Paid (ชำระเงินแล้ว)</option>
                  <option value="shipped">Shipped (กำลังจัดส่ง)</option>
                  <option value="completed">Completed (จัดส่งสำเร็จ)</option>
                  <option value="cancelled">Cancelled (ยกเลิก)</option>
                </select>
              </div>

              <hr className="border-gray-200 dark:border-gray-700 my-4" />
              
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">เพิ่มประวัติการจัดส่ง (Tracking)</h4>
              <p className="text-xs text-gray-500 mb-2">หากไม่ได้เคลื่อนย้ายสินค้า ให้เว้นว่าง 2 ช่องนี้ไว้</p>

              {/* 2. รายละเอียดการส่ง */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียด (เช่น สินค้าถึงศูนย์คัดแยก)</label>
                <input 
                  type="text" 
                  value={statusDetail} 
                  onChange={e => setStatusDetail(e.target.value)} 
                  placeholder="เช่น พัสดุถูกรับเข้าระบบแล้ว"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 3. สถานที่ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สถานที่ / จังหวัด (ถ้ามี)</label>
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  placeholder="เช่น ศูนย์คัดแยกสินค้า จ.สมุทรปราการ"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* ปุ่มกดยืนยัน */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setUpdateModal(false)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-colors">
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