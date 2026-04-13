import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import HomePage from './pages/HomePage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          {/* รองรับการขยาย Routes อื่นๆ ในอนาคตได้ทันที เช่น /login, /admin */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;