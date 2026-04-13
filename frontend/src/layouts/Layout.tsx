import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  const totalItems = useSelector((state: RootState) => state.cart.totalItems);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setIsDark(currentTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <h1 style={{ color: 'var(--accent-color)', margin: 0 }}>Shopping Mall</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}>
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <div style={{ fontWeight: 'bold' }}>🛒 Cart ({totalItems})</div>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;