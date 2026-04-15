import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { centerApi, shipmentApi } from '../../services/api';

export default function CenterPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shipments');
  
  const [centerInfo, setCenterInfo] = useState({ id: 0, name: '' });
  const [shipments, setShipments] = useState<any[]>([]);

  // Modals Data
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  // Form Data
  const [updateAction, setUpdateAction] = useState('at_center'); // at_center, delivering, shipped_to_center
  const [targetId, setTargetId] = useState(''); // Rider ID or Center ID
  const [trackingDetail, setTrackingDetail] = useState('');
  const [locationStr, setLocationStr] = useState('');

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => {
      if (data.role !== 'center' && data.role !== 'admin') {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        navigate('/settings');
      } else {
        fetchData();
      }
    }).catch(() => navigate('/login'));
  }, []);

  const fetchData = async () => {
    try {
      const res = await centerApi.getDashboard();
      if (res.data.has_center) {
        setCenterInfo(res.data.center);
        setShipments(res.data.shipments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (e: any) => {
    e.preventDefault();
    try {
      await centerApi.updateProfile({ name: e.target.center_name.value });
      alert("บันทึกข้อมูลศูนย์สำเร็จ");
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const openUpdateModal = (shipment: any) => {
    setSelectedShipment(shipment);
    if (shipment.status === 'shipped_to_center') {
      setUpdateAction('at_center');
      setTrackingDetail('พัสดุเดินทางถึงศูนย์คัดแยกแล้ว');
    } else if (shipment.status === 'at_center') {
      setUpdateAction('delivering');
      setTrackingDetail('พัสดุกำลังถูกนำจ่ายโดยพนักงานจัดส่ง');
    }
    setLocationStr(centerInfo.name || `Center ID: ${centerInfo.id}`);
    setTargetId('');
    setShowUpdateModal(true);
  };

  const submitUpdate = async (e: any) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      await shipmentApi.updateStatus({
        shipment_id: selectedShipment.shipment_id,
        status: updateAction,
        center_id: updateAction === 'shipped_to_center' ? Number(targetId) : undefined,
        rider_id: updateAction === 'delivering' ? Number(targetId) : undefined,
        tracking_detail: trackingDetail,
        location: locationStr
      });
      setShowUpdateModal(false);
      fetchData();
      alert('อัปเดตสถานะพัสดุสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาดในการอัปเดต'); }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'shipped_to_center': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'at_center': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivering': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'shipped_to_center': return 'กำลังเดินทางมาที่นี่';
      case 'at_center': return 'พัสดุอยู่ที่ศูนย์นี้';
      case 'delivering': return 'กำลังนำจ่ายโดย Rider';
      case 'completed': return 'จัดส่งสำเร็จแล้ว';
      default: return status;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pt-8 pb-4 px-6 lg:px-12">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Delivery Center</h1>
        <p className="text-gray-500 dark:text-gray-400">ศูนย์: <span className="font-bold text-purple-600">{centerInfo.name || 'ยังไม่ได้ตั้งชื่อศูนย์'} (ID: {centerInfo.id})</span></p>
        
        <div className="flex gap-4 mt-8 overflow-x-auto">
          {['shipments', 'profile'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'shipments' ? 'พัสดุรับเข้า/กระจายออก' : 'ตั้งค่าข้อมูลศูนย์'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 lg:p-12">
        
        {/* TAB 1: SHIPMENTS */}
        {activeTab === 'shipments' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">จัดการพัสดุในระบบ</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="p-4">Shipment ID</th>
                    <th className="p-4">Order ID หลัก</th>
                    <th className="p-4">ปลายทาง (ลูกค้า)</th>
                    <th className="p-4">สถานะปัจจุบัน</th>
                    <th className="p-4 text-right">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {shipments.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">ไม่มีพัสดุที่เกี่ยวข้องกับศูนย์นี้</td></tr> :
                    shipments.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="p-4 font-bold text-gray-900 dark:text-white">#{s.shipment_id}</td>
                        <td className="p-4 text-gray-500">#{s.order_id}</td>
                        <td className="p-4 text-sm dark:text-gray-300 max-w-62.5 truncate" title={s.address}>{s.address}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(s.status)}`}>
                            {getStatusText(s.status)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {(s.status === 'shipped_to_center' || s.status === 'at_center') && (
                            <button onClick={() => openUpdateModal(s)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition">
                              จัดการพัสดุ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">แก้ไขข้อมูลศูนย์กระจายสินค้า</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อศูนย์</label>
                <input type="text" name="center_name" required className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white" defaultValue={centerInfo.name} />
              </div>
              <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md">บันทึกข้อมูลศูนย์</button>
            </form>
          </div>
        )}

      </div>

      {/* Shipment Update Modal */}
      {showUpdateModal && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold dark:text-white mb-2">อัปเดตพัสดุ #{selectedShipment.shipment_id}</h3>
            
            <form onSubmit={submitUpdate} className="space-y-4 mt-6">
              
              {selectedShipment.status === 'shipped_to_center' ? (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-800 dark:text-purple-300 text-sm font-medium">
                  สถานะ: พัสดุเดินทางมาถึงศูนย์แล้ว ให้ทำการ "กดรับพัสดุเข้าศูนย์" เพื่อเตรียมจ่ายงานในขั้นตอนต่อไป
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">รูปแบบการจ่ายงาน</label>
                  <select value={updateAction} onChange={e=>setUpdateAction(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white">
                    <option value="delivering">📦 จ่ายงานให้ Rider นำไปส่งให้ลูกค้า</option>
                    <option value="shipped_to_center">🏢 ส่งพัสดุต่อไปยัง Center อื่น</option>
                  </select>
                </div>
              )}

              {updateAction === 'delivering' && selectedShipment.status !== 'shipped_to_center' && (
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">รหัสพนักงานขนส่ง (Rider ID)</label>
                  <input type="number" required value={targetId} onChange={e=>setTargetId(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                </div>
              )}

              {updateAction === 'shipped_to_center' && selectedShipment.status !== 'shipped_to_center' && (
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">รหัสศูนย์ปลายทาง (Center ID)</label>
                  <input type="number" required value={targetId} onChange={e=>setTargetId(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">ข้อความ Tracking ที่แจ้งลูกค้า</label>
                <input type="text" required value={trackingDetail} onChange={e=>setTrackingDetail(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
              </div>
              
              <div>
                <label className="block text-sm font-bold dark:text-gray-300 mb-1">สถานที่อัปเดต</label>
                <input type="text" required value={locationStr} onChange={e=>setLocationStr(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg font-bold">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md">
                  {selectedShipment.status === 'shipped_to_center' ? 'รับพัสดุเข้าศูนย์' : 'ยืนยันการจ่ายงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}