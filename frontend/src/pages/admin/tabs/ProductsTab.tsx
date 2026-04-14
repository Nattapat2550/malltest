// frontend/src/pages/admin/tabs/ProductsTab.tsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api'; // ปรับ path ให้ตรงกับโครงสร้างของคุณ (อาจจะเป็น '../../../services/api')

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // สำหรับ Modal สร้าง/แก้ไข
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: 0,
    stock: 0,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/products');
      setProducts(res.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลสินค้าได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        sku: product.sku,
        name: product.name,
        price: product.price,
        stock: product.stock,
      });
    } else {
      setEditingId(null);
      setFormData({ sku: '', name: '', price: 0, stock: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/admin/products/${editingId}`, formData);
      } else {
        await api.post('/api/admin/products', formData);
      }
      handleCloseModal();
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบสินค้า');
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-white font-bold">กำลังโหลดข้อมูลสินค้า...</div>;
  if (error) return <div className="text-center py-10 text-red-500 font-bold">{error}</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-gray-900 dark:text-white">จัดการคลังสินค้า (Inventory)</h3>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-colors"
        >
          + เพิ่มสินค้าใหม่
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 text-sm">
              <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700 rounded-tl-xl">ID</th>
              <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">SKU</th>
              <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">ชื่อสินค้า</th>
              <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">ราคา (บาท)</th>
              <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">สต็อกคงเหลือ</th>
              <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700 rounded-tr-xl">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  ยังไม่มีข้อมูลสินค้าในระบบ
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="p-4 text-gray-900 dark:text-white font-medium">{p.id}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{p.sku}</td>
                  <td className="p-4 text-gray-900 dark:text-white font-bold">{p.name}</td>
                  <td className="p-4 text-green-600 dark:text-green-400 font-bold">{p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-gray-900 dark:text-white font-medium">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p.stock > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-lg font-bold transition-colors"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 py-1.5 px-3 rounded-lg font-bold transition-colors"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal สำหรับเพิ่ม/แก้ไขสินค้า */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                {editingId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสสินค้า (SKU)</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น IT-001"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อสินค้า</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ชื่อสินค้า..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ราคา (บาท)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">จำนวนสต็อก</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-colors"
                >
                  {editingId ? 'บันทึกการแก้ไข' : 'สร้างสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}