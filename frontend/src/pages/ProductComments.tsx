import React, { useState, useEffect } from 'react';
import { commentApi } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface Comment {
  id: string; // เปลี่ยนเป็น string เพราะ Database ใช้ UUID
  user_id: string;
  rating: number;
  message: string;
  created_at: string;
}

// เปลี่ยน productId เป็น string
export const ProductComments: React.FC<{ productId: string }> = ({ productId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const { userId } = useSelector((state: RootState) => state.auth);
  
  // เปลี่ยน editingId เป็น string | null
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, message: '' });

  const fetchComments = async () => {
    // ป้องกันกรณีที่ productId เป็น undefinded หรือว่างเปล่า
    if (!productId) return; 
    
    try {
      const res = await commentApi.getComments(productId);
      setComments(res.data || []);
    } catch (err) {
      console.error("Error fetching comments", err);
    }
  };

  useEffect(() => { fetchComments(); }, [productId]);

  // เปลี่ยน id เป็น string
  const handleDelete = async (id: string) => {
    if (window.confirm('คุณต้องการลบรีวิวนี้ใช่หรือไม่?')) {
      try {
        await commentApi.deleteComment(productId, id);
        fetchComments();
      } catch (err) {
        alert('ลบไม่สำเร็จ');
      }
    }
  };

  // เปลี่ยน id เป็น string
  const handleUpdate = async (id: string) => {
    try {
      await commentApi.updateComment(productId, id, editForm);
      setEditingId(null);
      fetchComments();
    } catch (err) {
      alert('แก้ไขไม่สำเร็จ');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white">รีวิวจากผู้ใช้งาน ({comments.length})</h3>
      </div>

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-center py-10 text-gray-500 dark:text-gray-400 italic">ยังไม่มีรีวิวสำหรับสินค้านี้</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 dark:border-gray-700 pb-6 last:border-0">
              {editingId === comment.id ? (
                // --- โหมดแก้ไข ---
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl space-y-3">
                  <select 
                    value={editForm.rating} 
                    onChange={(e) => setEditForm({...editForm, rating: Number(e.target.value)})}
                    className="border rounded-lg p-1 text-sm dark:bg-gray-800 dark:text-white"
                  >
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ดาว</option>)}
                  </select>
                  <textarea 
                    className="w-full border rounded-xl p-3 text-sm dark:bg-gray-800 dark:text-white"
                    value={editForm.message}
                    onChange={(e) => setEditForm({...editForm, message: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(comment.id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold">บันทึก</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 px-4 py-1.5 text-sm">ยกเลิก</button>
                  </div>
                </div>
              ) : (
                // --- โหมดแสดงผลปกติ ---
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-yellow-400">
                        {'★'.repeat(comment.rating)}{'☆'.repeat(5-comment.rating)}
                      </div>
                      <p className="text-gray-900 dark:text-white font-bold">{comment.message}</p>
                    </div>
                    
                    {/* ปุ่มจัดการคอมเมนต์ตัวเอง */}
                    {userId && String(userId) === comment.user_id && (
                      <div className="flex gap-3 text-xs">
                        <button 
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditForm({ rating: comment.rating, message: comment.message });
                          }}
                          className="text-blue-500 font-bold hover:underline"
                        >
                          แก้ไข
                        </button>
                        <button 
                          onClick={() => handleDelete(comment.id)} 
                          className="text-red-500 font-bold hover:underline"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    โดย {comment.user_id} • {new Date(comment.created_at).toLocaleDateString('th-TH')}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};