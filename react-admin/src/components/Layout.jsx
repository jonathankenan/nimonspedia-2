import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
  const adminName = localStorage.getItem('adminName') || 'Admin';

  const handleLogout = () => {
    if (window.confirm('Yakin ingin logout dari Admin Panel?')) {
      localStorage.clear();
      window.location.href = '/admin/login';
    }
  };

  return (
    <div className="admin-layout">
      {/* NAVBAR BIRU */}
      <nav className="top-nav">
        
        {/* KIRI: Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="nav-brand">
            <h2>Nimonspedia</h2>
          </div>
        </Link>

        {/* KANAN: Profil & Logout */}
        <div className="nav-right">
          <div className="admin-profile">
            <div className="admin-name">Halo, {adminName}</div>
          </div>
          
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      {/* KONTEN UTAMA */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;