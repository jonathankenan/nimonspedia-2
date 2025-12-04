import { Link, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
    const adminName = localStorage.getItem('adminName') || localStorage.getItem('userName') || 'User';
    const userRole = localStorage.getItem('userRole') || 'ADMIN';
    const navigate = useNavigate();

    const handleLogout = () => {
        if (window.confirm('Yakin ingin logout?')) {
            localStorage.clear();
            navigate('/login');
        }
    };

    return (
        <div className="admin-layout">
            <nav className="top-nav">

                {/* Kiri */}
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <div className="nav-brand">
                        <h2>Nimonspedia</h2>
                    </div>
                </Link>

                {/* Tengah */}
                <div className="nav-center" style={{ display: 'flex', gap: '20px', marginLeft: '40px' }}>
                    {userRole === 'ADMIN' && (
                        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
                            Dashboard
                        </Link>
                    )}

                    {(userRole === 'BUYER' || userRole === 'SELLER') && (
                        <>
                            <Link to="/auction" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
                                🔨 Auction
                            </Link>
                            {userRole === 'BUYER' && (
                                <Link to="/my-bids" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
                                    My Bids
                                </Link>
                            )}
                            {userRole === 'SELLER' && (
                                <Link to="/seller/auctions" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
                                    My Auctions
                                </Link>
                            )}
                        </>
                    )}
                </div>

                {/* Kanan */}
                <div className="nav-right">
                    <div className="admin-profile">
                        <div className="admin-name">Halo, {adminName}</div>
                    </div>

                    <button onClick={handleLogout} className="btn-logout">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
