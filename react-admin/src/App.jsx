import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
import AuctionList from './auction/pages/AuctionList';
import AuctionDetail from './auction/pages/AuctionDetail';
import Layout from './Layout';

// Komponen Proteksi dengan Role-Based Access
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const userRole = localStorage.getItem('userRole');

      // Jika ada token React, gunakan itu
      if (token && userRole) {
        if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
          setAllowed(true);
        }
        setLoading(false);
        return;
      }

      // Jika tidak ada token, coba check PHP session
      try {
        const res = await fetch('/api/session.php', { credentials: 'include' });
        const data = await res.json();

        if (data.ok && (allowedRoles.length === 0 || allowedRoles.includes(data.role))) {
          // Simpan role dari PHP session ke localStorage untuk UI
          localStorage.setItem('userRole', data.role);
          localStorage.setItem('userName', data.name || '');
          setAllowed(true);
        }
      } catch (err) {
        // PHP session check gagal
      }

      setLoading(false);
    };

    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Memuat...</div>;
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin Panel */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Auction Pages (Buyer & Seller) */}
      <Route path="/auction" element={
        <ProtectedRoute allowedRoles={['BUYER', 'SELLER']}>
          <Layout>
            <AuctionList />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/auction/:auctionId" element={
        <ProtectedRoute allowedRoles={['BUYER', 'SELLER']}>
          <Layout>
            <AuctionDetail />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Buyer Routes */}
      {/* <Route path="/my-bids" element={
        <ProtectedRoute allowedRoles={['BUYER']}>
          <Layout>
            <MyBids />
          </Layout>
        </ProtectedRoute>
      } /> */}

      {/* Seller Routes */}
      {/* <Route path="/seller/auctions" element={
        <ProtectedRoute allowedRoles={['SELLER']}>
          <Layout>
            <MyAuctions />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/seller/auction/create" element={
        <ProtectedRoute allowedRoles={['SELLER']}>
          <Layout>
            <CreateAuction />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/seller/auction/:auctionId/edit" element={
        <ProtectedRoute allowedRoles={['SELLER']}>
          <Layout>
            <EditAuction />
          </Layout>
        </ProtectedRoute>
      } /> */}

      {/* Redirect sembarang URL yang salah ke Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;