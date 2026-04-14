import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

interface User {
  id: string;
  email: string;
  role: string;
  wallet_balance?: number;
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wallet Modal State
  const [walletModal, setWalletModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/users');
      // หาก API ส่งกลับมาเป็น array ก็เซ็ตค่าได้เลย
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      // กรณี API ขัดข้อง ให้แสดงข้อมูลว่างไปก่อน
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
  }, []);

  const openWalletModal = (user: User) => {
    setSelectedUser(user);
    setNewBalance(user.wallet_balance || 0);
    setWalletModal(true);
  };

  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.put(`/api/admin/users/${selectedUser.id}/wallet`, { balance: newBalance });
      setWalletModal(false);
      fetchUsers(); // โหลดข้อมูลใหม่เพื่ออัปเดตตาราง
      alert('อัปเดตยอดเงินสำเร็จ');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปเดตยอดเงิน');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูลผู้ใช้งาน...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">จัดการผู้ใช้งาน & การเงิน</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
              <th className="p-4">ID</th>
              <th className="p-4">Email</th>
              <th className="p-4">สิทธิ์</th>
              <th className="p-4">ยอดเงิน (Wallet)</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  ไม่มีข้อมูลผู้ใช้งาน
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-xs font-mono">{u.id}</td>
                  <td className="p-4 text-gray-900 dark:text-white font-medium">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {u.role ? u.role.toUpperCase() : 'USER'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-green-600 dark:text-green-400">
                    ฿{(u.wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button 
                      onClick={() => openWalletModal(u)} 
                      className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      จัดการเงิน
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal แก้ไขกระเป๋าเงิน */}
      {walletModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">ปรับปรุงยอดเงิน</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">บัญชี: {selectedUser.email}</p>
            
            <form onSubmit={handleUpdateWallet}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ยอดเงินคงเหลือ (บาท)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  value={newBalance} 
                  onChange={e => setNewBalance(parseFloat(e.target.value) || 0)} 
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setWalletModal(false)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-colors">
                  บันทึกยอดเงิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}