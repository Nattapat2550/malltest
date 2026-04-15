import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const useOAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('token=')) return;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('token');
    const role = params.get('role');

    if (token) {
      localStorage.setItem('token', token);
      if (role) localStorage.setItem('role', role);
      
      api.get('/api/auth/status')
        .then((res) => {
          if (res.data && res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.dispatchEvent(new Event('user-updated'));
          }
          const targetUrl = role === 'admin' ? '/admin' : '/home';
          window.history.replaceState(null, '', targetUrl);
          navigate(targetUrl, { replace: true });
        })
        .catch(() => {
          window.history.replaceState(null, '', '/home');
          navigate('/home', { replace: true });
        });
    }
  }, [navigate]);
};