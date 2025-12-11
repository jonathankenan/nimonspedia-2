import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchUserBalance, fetchSellerActiveAuction } from './auction/api/auctionApi';

const Layout = ({ children }) => {
    const adminName = localStorage.getItem('adminName') || localStorage.getItem('userName') || 'User';
    const userRole = localStorage.getItem('userRole') || 'ADMIN';
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [sellerAuctionId, setSellerAuctionId] = useState(null);

    // (kenan) Helper function untuk cek auction feature flag
    const handleAuctionNavigation = async (e, path) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/features/check?feature=auction_enabled', {
                credentials: 'include'
            });
            const data = await response.json();
            if (!data.enabled) {
                const reason = data.reason || 'Fitur lelang sedang dinonaktifkan';
                window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
            } else {
                navigate(path);
            }
        } catch (error) {
            console.error('Failed to check feature flag:', error);
            navigate(path); // Fallback jika check gagal
        }
    };
    // udah

    useEffect(() => {
        const token = localStorage.getItem('adminToken');

        if (userRole === 'BUYER') {
            const loadBalance = async () => {
                try {
                    let bal = 0;
                    const res = await fetch('/api/user-balance.php', {
                        credentials: 'include'
                    });
                    const data = await res.json();
                    bal = data.balance ?? 0;
                    setBalance(bal);
                } catch (err) {
                    console.error('Failed to load balance', err);
                }
            };
            loadBalance();
        }
    }, [userRole]);

    const handleLogout = () => {
            localStorage.clear();
            window.location.href = '/authentication/logout.php';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="admin-layout">
            <nav className="top-nav">

                {/* Kiri */}
                <div className="nav-brand">
                    {userRole === 'SELLER' ? (
                        <a href="/seller/dashboard.php" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h2>Nimonspedia</h2>
                        </a>
                    ) : userRole === 'BUYER' ? (
                        <a href="/index.php" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h2>Nimonspedia</h2>
                        </a>
                    ) : (
                        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h2>Nimonspedia</h2>
                        </Link>
                    )}
                </div>

                {/* Kanan - Nav Links */}
                <div className="nav-right" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginLeft: 'auto' }}>

                    {/* ADMIN Links */}
                    {userRole === 'ADMIN' && (
                        <Link to="/" className="nav-link">
                            Dashboard
                        </Link>
                    )}

                    {/* BUYER Links */}
                    {userRole === 'BUYER' && (
                        <>
                            <a href="/auction" onClick={(e) => handleAuctionNavigation(e, '/auction')} className="nav-link">
                                Auction
                            </a>
                            <a href="/buyer/cart.php" className="nav-link">
                                Keranjang
                            </a>
                            <span className="nav-text" style={{ color: 'white' }}>
                                Balance: {formatCurrency(balance)}
                            </span>

                            {/* Dropdown-like Profile Links (Simplified as inline for now) */}
                            <a href="/buyer/profile.php" className="nav-link">
                                Profile
                            </a>
                            <a href="/buyer/orders.php" className="nav-link">
                                Order History
                            </a>
                        </>
                    )}

                    {/* SELLER Links */}
                    {userRole === 'SELLER' && (
                        <>
                            <a href="/seller/dashboard.php" className="nav-link">
                                Dashboard
                            </a>
                            <a href="/seller/kelola_produk.php" className="nav-link">
                                Kelola Produk
                            </a>
                            {sellerAuctionId && (
                                <a href={`/auction/${sellerAuctionId}`} onClick={(e) => handleAuctionNavigation(e, `/auction/${sellerAuctionId}`)} className="nav-link">
                                    Auction
                                </a>
                            )}
                            <a href="/seller/order_management.php" className="nav-link">
                                Lihat Pesanan
                            </a>
                            <a href="/seller/tambah_produk.php" className="nav-link">
                                Tambah Produk
                            </a>
                        </>
                    )}

                    {/* User Profile & Logout */}
                    <div className="admin-profile" style={{ marginLeft: '10px' }}>
                        <div className="admin-name">{adminName}</div>
                    </div>

                    <button onClick={handleLogout} className="btn-logout" style={{ marginLeft: '10px' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="main-content">
                {children}
            </main>

            <style>{`
    .nav - link {
    color: white;
    text - decoration: none;
    font - size: 0.95rem;
    transition: opacity 0.2s;
}
                .nav - link:hover {
    opacity: 0.8;
}
                .top - nav {
    display: flex;
    justify - content: space - between;
    align - items: center;
    padding: 0 20px;
    background - color: #0A75BD; /* Match PHP navbar color if possible */
    height: 60px;
}
                .nav - brand h2 {
    margin: 0;
    color: white;
}
`}</style>
        </div>
    );
};

export default Layout;
