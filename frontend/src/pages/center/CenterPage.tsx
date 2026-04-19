import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { centerApi, shipmentApi } from '../../services/api';

export default function CenterPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shipments');
  
  const [centerInfo, setCenterInfo] = useState({ id: '', name: '' });
  const [shipments, setShipments] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);

  // ระบบ Batch Assign
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchRiderId, setBatchRiderId] = useState('');

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const [updateAction, setUpdateAction] = useState('at_center'); 
  const [targetId, setTargetId] = useState('');
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
      const riderRes = await api.get('/api/center/riders');
      setRiders(riderRes.data || []);
      setSelectedIds([]); // เคลียร์ที่เลือกไว้หลังโหลดใหม่
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
        center_id: updateAction === 'shipped_to_center' ? targetId : undefined,
        rider_id: updateAction === 'delivering' ? targetId : undefined,
        tracking_detail: trackingDetail,
        location: locationStr
      });
      setShowUpdateModal(false);
      fetchData();
      alert('อัปเดตสถานะพัสดุสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาดในการอัปเดต'); }
  };

  const handleAddRider = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/api/center/riders', { rider_user_id: e.target.rider_id.value });
      e.target.reset();
      fetchData();
      alert("เพิ่ม Rider สำเร็จ");
    } catch (err) { alert("เพิ่มไม่สำเร็จ อาจไม่มีรหัสนี้"); }
  };

  const handleRemoveRider = async (id: string) => {
    if(window.confirm("ต้องการลบ Rider ออกจากศูนย์ใช่หรือไม่?")) {
      await api.delete(`/api/center/riders/${id}`);
      fetchData();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchAssign = async () => {
    if (!batchRiderId) return alert("กรุณาเลือก Rider ก่อน");
    try {
      await api.post('/api/center/shipments/batch-assign', {
        shipment_ids: selectedIds,
        rider_id: batchRiderId
      });
      alert(`จ่ายงานให้พัสดุจำนวน ${selectedIds.length} ชิ้นสำเร็จ!`);
      setBatchRiderId('');
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาดในการจ่ายงานกลุ่ม"); }
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
        <p className="text-gray-500 dark:text-gray-400">ศูนย์: <span className="font-bold text-purple-600">{centerInfo.name || 'ยังไม่ได้ตั้งชื่อศูนย์'} <br className="md:hidden" /><span className="text-xs break-all">(ID: {centerInfo.id})</span></span></p>
        
        <div className="flex gap-4 mt-8 overflow-x-auto">
          {['shipments', 'riders', 'profile'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'shipments' ? 'พัสดุรับเข้า/กระจายออก' : tab === 'riders' ? 'จัดการ Rider' : 'ตั้งค่าข้อมูลศูนย์'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 lg:p-12">
        
        {activeTab === 'shipments' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">จัดการพัสดุในระบบ</h2>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200">
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-400 ml-2">เลือกแล้ว {selectedIds.length} ชิ้น</span>
                  <select value={batchRiderId} onChange={e => setBatchRiderId(e.target.value)} className="p-2 text-sm rounded-lg border dark:bg-gray-800 dark:text-white">
                    <option value="">-- เลือก Rider ที่จะจ่ายงาน --</option>
                    {riders.map(r => <option key={r.id} value={r.id}>{r.rider_user_id}</option>)}
                  </select>
                  <button onClick={handleBatchAssign} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm">จ่ายงาน</button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="p-4 w-10">#</th>
                    <th className="p-4">Shipment ID</th>
                    <th className="p-4">Order ID หลัก</th>
                    <th className="p-4">ปลายทาง (ลูกค้า)</th>
                    <th className="p-4">สถานะปัจจุบัน</th>
                    <th className="p-4 text-right">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {shipments.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">ไม่มีพัสดุที่เกี่ยวข้องกับศูนย์นี้</td></tr> :
                    shipments.map((s, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${selectedIds.includes(s.shipment_id) ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                        <td className="p-4">
                          {s.status === 'at_center' && (
                            <input type="checkbox" className="w-5 h-5 cursor-pointer accent-orange-500" checked={selectedIds.includes(s.shipment_id)} onChange={() => toggleSelect(s.shipment_id)} />
                          )}
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-900 dark:text-white">#{s.shipment_id}</td>
                        <td className="p-4 text-xs font-mono text-gray-500">#{s.order_id}</td>
                        <td className="p-4 text-sm dark:text-gray-300 max-w-62.5 truncate" title={s.address}>{s.address}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(s.status)}`}>
                            {getStatusText(s.status)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {(s.status === 'shipped_to_center' || s.status === 'at_center') && (
                            <button onClick={() => openUpdateModal(s)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition">
                              จัดการเดี่ยว
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

        {activeTab === 'riders' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">จัดการ Rider ประจำศูนย์</h2>
            <form onSubmit={handleAddRider} className="flex gap-4 max-w-md mb-8">
              <input type="text" name="rider_id" required placeholder="User ID ของ Rider (ตัวอักษรหรือตัวเลข)" className="flex-1 px-4 py-2 rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md whitespace-nowrap">เพิ่มเข้าศูนย์</button>
            </form>

            <table className="w-full max-w-2xl text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                  <th className="p-4">Rider DB ID</th>
                  <th className="p-4">User Account ID</th>
                  <th className="p-4 text-right">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {riders.length === 0 ? <tr><td colSpan={3} className="p-6 text-center text-gray-500">ยังไม่มี Rider ในศูนย์</td></tr> : 
                  riders.map(r => (
                    <tr key={r.id}>
                      <td className="p-4 font-mono text-xs dark:text-gray-300">{r.id}</td>
                      <td className="p-4 font-bold text-blue-600">{r.rider_user_id}</td>
                      <td className="p-4 text-right"><button onClick={() => handleRemoveRider(r.id)} className="text-red-500 hover:underline font-bold text-sm">นำออก</button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

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

      {showUpdateModal && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold dark:text-white mb-2 break-all">อัปเดตพัสดุ #{selectedShipment.shipment_id}</h3>
            
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
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">เลือก Rider จากศูนย์</label>
                  <select value={targetId} onChange={e=>setTargetId(e.target.value)} required className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white">
                    <option value="">-- เลือก Rider --</option>
                    {riders.map(r => <option key={r.id} value={r.id}>{r.rider_user_id}</option>)}
                  </select>
                </div>
              )}

              {updateAction === 'shipped_to_center' && selectedShipment.status !== 'shipped_to_center' && (
                <div>
                  <label className="block text-sm font-bold dark:text-gray-300 mb-1">รหัสศูนย์ปลายทาง (Center ID)</label>
                  <input type="text" required value={targetId} onChange={e=>setTargetId(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
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