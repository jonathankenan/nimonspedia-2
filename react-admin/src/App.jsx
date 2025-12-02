import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'

// Komponen sederhana untuk memproteksi halaman Dashboard
// Jika tidak ada token, tendang ke login
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Komponen Dashboard sementara
const Dashboard = () => {
  const adminName = localStorage.getItem('adminName')
  const logout = () => {
    localStorage.clear()
    window.location.href = '/admin/login'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard Admin</h1>
      <p>Selamat datang, <b>{adminName}</b>!</p>
      <button onClick={logout} style={{ padding: '5px 10px', marginTop: '10px' }}>
        Logout
      </button>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App