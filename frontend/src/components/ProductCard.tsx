import React from 'react';
import { Product } from '../store/slices/cartSlice';

interface Props {
  product: Product;
  onAdd: () => void;
}

const ProductCard: React.FC<Props> = ({ product, onAdd }) => {
  return (
    <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>{product.name}</h3>
      <p style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
          ฿{product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <button 
          onClick={onAdd} 
          disabled={product.stock <= 0}
          style={{ 
            backgroundColor: product.stock > 0 ? 'var(--accent-color)' : 'var(--border-color)', 
            color: '#fff', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '4px',
            cursor: product.stock > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};
export default ProductCard;