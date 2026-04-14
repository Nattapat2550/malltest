import React, { useState, useEffect } from 'react';
import { commentApi } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface Comment {
  id: number;
  user_id: string;
  rating: number;
  message: string;
  created_at: string;
}

export const ProductComments: React.FC<{ productId: number }> = ({ productId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const { userId } = useSelector((state: RootState) => state.auth);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, message: '' });

  const fetchComments = async () => {
    const res = await commentApi.getComments(productId);
    setComments(res.data);
  };

  useEffect(() => { fetchComments(); }, [productId]);

  const handleDelete = async (id: number) => {
    if (window.confirm('ยืนยันการลบคอมเมนต์?')) {
      await commentApi.deleteComment(productId, id);
      fetchComments();
    }
  };

  const handleUpdate = async (id: number) => {
    await commentApi.updateComment(productId, id, editForm);
    setEditingId(null);
    fetchComments();
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">รีวิวสินค้า</h3>
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border p-4 rounded-lg shadow-sm">
            {editingId === comment.id ? (
              <div className="space-y-2">
                <select 
                  value={editForm.rating} 
                  onChange={(e) => setEditForm({...editForm, rating: Number(e.target.value)})}
                  className="border p-1"
                >
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ดาว</option>)}
                </select>
                <textarea 
                  className="w-full border p-2"
                  value={editForm.message}
                  onChange={(e) => setEditForm({...editForm, message: e.target.value})}
                />
                <button onClick={() => handleUpdate(comment.id)} className="bg-green-500 text-white px-3 py-1 rounded mr-2">บันทึก</button>
                <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded">ยกเลิก</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="font-semibold text-blue-600">{comment.user_id}</span>
                  <span className="text-yellow-500">{"⭐".repeat(comment.rating)}</span>
                </div>
                <p className="text-gray-700 my-2">{comment.message}</p>
                <div className="text-sm text-gray-400 flex justify-between">
                  <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  {/* แสดงปุ่มเมื่อ user_id ตรงกับคนที่ Login อยู่ */}
                  {userId && String(userId) === comment.user_id && (
                    <div>
                      <button 
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditForm({ rating: comment.rating, message: comment.message });
                        }}
                        className="text-blue-500 mr-3 underline"
                      >แก้ไข</button>
                      <button onClick={() => handleDelete(comment.id)} className="text-red-500 underline">ลบ</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};