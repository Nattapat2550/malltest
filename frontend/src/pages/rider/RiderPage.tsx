import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { riderApi, shipmentApi } from '../../services/api';

export default function RiderPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('current'); // current, history
  
  const [riderId, setRiderId] = useState<number | null>(null);
  const [shipments, setShipments] = useState<any[]>([]);

  // Modals Data
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  // Form Data
  const [trackingDetail, setTrackingDetail] = useState('จัดส่งพัสดุให้ลูกค้าเรียบร้อยแล้ว');
  const [locationStr, setLocationStr] = useState('หน้าบ้านลูกค้า / จุดรับของ');

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      if (data.role !== 'rider' && data.role !== 'admin') {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        navigate('/settings');
      } else {
        fetchData();
      }
    }).catch(() => navigate('/login'));
  }, []);

  const fetchData = async () => {
    try {
      const res = await riderApi.getDashboard();
      setRiderId(res.data.rider_id);
      setShipments(res.data.shipments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openUpdateModal = (shipment: any) => {
    setSelectedShipment(shipment);
    setTrackingDetail('จัดส่งพัสดุให้ลูกค้าเรียบร้อยแล้ว');
    setLocationStr('หน้าบ้านลูกค้า / จุดรับของ');
    setShowUpdateModal(true);
  };

  const submitUpdate = async (e: any) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      await shipmentApi.updateStatus({
        shipment_id: selectedShipment.shipment_id,
        status: 'completed',
        tracking_detail: trackingDetail,
        location: locationStr
      });
      setShowUpdateModal(false);
      fetchData();
      alert('บันทึกการจัดส่งสำเร็จ เยี่ยมมาก!');
    } catch (err) { alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ'); }
  };

  // กรองข้อมูลตาม Tab
  const currentJobs = shipments.filter(s => s.status === 'delivering');
  const historyJobs = shipments.filter(s => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pt-8 pb-4 px-6 lg:px-12">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Rider Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">รหัสพนักงานของคุณ: <span className="font-bold text-pink-600">#{riderId || '-'}</span></p>
        
        <div className="flex gap-4 mt-8 overflow-x-auto">
          <button onClick={() => setActiveTab('current')} className={`pb-3 px-2 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'current' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            📦 งานปัจจุบัน ({currentJobs.length})
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-3 px-2 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'history' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            ✅ ประวัติการส่ง ({historyJobs.length})
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-12 max-w-5xl mx-auto">
        
        {activeTab === 'current' && (
          <div className="grid gap-6">
            {currentJobs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
                🎉 ขณะนี้ไม่มีพัสดุที่ต้องนำจ่าย พักผ่อนได้เลย!
              </div>
            ) : currentJobs.map((s, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">กำลังนำจ่าย</span>
                    <h3 className="font-bold dark:text-white">รหัสพัสดุ: #{s.shipment_id}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Order หลัก: #{s.order_id} | ลูกค้า ID: {s.customer_id}</p>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm dark:text-gray-300 border dark:border-gray-700">
                    <div className="font-bold text-gray-700 dark:text-gray-400 mb-1">📍 ที่อยู่จัดส่ง:</div>
                    <p className="leading-relaxed">{s.address}</p>
                  </div>
                </div>
                
                <div className="flex items-end shrink-0">
                  <button onClick={() => openUpdateModal(s)} className="w-full md:w-auto px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-md transition">
                    ยืนยันจัดส่งสำเร็จ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-sm border-b dark:border-gray-700">
                  <th className="p-4">Shipment ID</th>
                  <th className="p-4">เวลาอัปเดตล่าสุด</th>
                  <th className="p-4">ปลายทาง</th>
                  <th className="p-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {historyJobs.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">ไม่มีประวัติการจัดส่ง</td></tr> :
                  historyJobs.map((s, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-4 font-bold dark:text-white">#{s.shipment_id}</td>
                      <td className="p-4 text-gray-500 text-sm">{new Date(s.updated_at).toLocaleString()}</td>
                      <td className="p-4 text-sm dark:text-gray-300 max-w-62.5 truncate" title={s.address}>{s.address}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {s.status === 'completed' ? 'จัดส่งสำเร็จ' : 'ยกเลิก'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold dark:text-white mb-2">อัปเดตการจัดส่งพัสดุ</h3>
            <p className="text-sm text-gray-500 mb-6">รหัสพัสดุ #{selectedShipment.shipment_id}</p>
            <form onSubmit={submitUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">ข้อความแจ้งลูกค้า</label>
                <input type="text" required value={trackingDetail} onChange={e=>setTrackingDetail(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">สถานที่อัปเดต (ตำแหน่งที่ส่ง)</label>
                <input type="text" required value={locationStr} onChange={e=>setLocationStr(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl font-bold transition">ยกเลิก</button>
                <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold shadow-md transition">✅ ยืนยันสำเร็จ</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}