import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Komponen Proteksi (Hanya yang punya token boleh masuk)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Route Dashboard (Halaman Utama) */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* Redirect sembarang URL yang salah ke Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;