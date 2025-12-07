import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
import AuctionList from './auction/pages/AuctionList';
import AuctionDetail from './auction/pages/AuctionDetail';
import CreateAuction from './auction/pages/CreateAuction';
import MyBids from './auction/pages/MyBids';
import Layout from './Layout';

// Komponen Proteksi dengan Role-Based Access
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const userRole = localStorage.getItem('userRole');

      console.log('[ProtectedRoute] Checking auth - token:', !!token, 'role:', userRole, 'allowedRoles:', allowedRoles);

      // Jika ada token React, gunakan itu
      if (token && userRole) {
        if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
          console.log('[ProtectedRoute] Allowed via localStorage');
          setAllowed(true);
        } else {
          console.log('[ProtectedRoute] Role mismatch - user:', userRole, 'allowed:', allowedRoles);
        }
        setLoading(false);
        return;
      }

      // Jika tidak ada token, coba check PHP session
      console.log('[ProtectedRoute] No localStorage token, checking PHP session...');
      try {
        const res = await fetch('/api/session.php', { credentials: 'include' });
        console.log('[ProtectedRoute] PHP session response status:', res.status);
        const data = await res.json();
        console.log('[ProtectedRoute] PHP session data:', data);

        if (data.ok && (allowedRoles.length === 0 || allowedRoles.includes(data.role))) {
          // Simpan role dari PHP session ke localStorage untuk UI
          localStorage.setItem('userRole', data.role);
          localStorage.setItem('userName', data.name || '');
          console.log('[ProtectedRoute] Allowed via PHP session, role:', data.role);
          setAllowed(true);
        } else {
          console.log('[ProtectedRoute] PHP session check failed or role mismatch');
        }
      } catch (err) {
        console.error('[ProtectedRoute] PHP session check error:', err);
      }

      setLoading(false);
    };

    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Memuat...</div>;
  }

  if (!allowed) {
    console.log('[ProtectedRoute] Access denied, redirecting...');
    // Check if this route is for buyer/seller (has BUYER or SELLER in allowedRoles)
    const isForBuyerSeller = allowedRoles.includes('BUYER') || allowedRoles.includes('SELLER');

    if (isForBuyerSeller) {
      // Redirect to PHP login for buyer/seller routes
      window.location.href = '/login.php';
      return null;
    } else {
      // Redirect to React admin login for admin routes
      return <Navigate to="/login" replace />;
    }
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
      <Route path="/my-bids" element={
        <ProtectedRoute allowedRoles={['BUYER']}>
          <Layout>
            <MyBids />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Seller Routes */}
      <Route path="/seller/auction/create" element={
        <ProtectedRoute allowedRoles={['SELLER']}>
          <Layout>
            <CreateAuction />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Redirect sembarang URL yang salah ke Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;