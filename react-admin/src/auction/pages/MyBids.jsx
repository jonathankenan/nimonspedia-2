import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserActiveBids } from '../api/auctionApi';

const MyBids = () => {
    const navigate = useNavigate();
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadBids();
    }, []);

    const loadBids = async () => {
        try {
            setLoading(true);
            setError('');

            // Check if user has React admin token or using PHP session
            const token = localStorage.getItem('adminToken');
            let data;

            if (token) {
                // Use Node.js API with JWT token
                data = await fetchUserActiveBids(token);
            } else {
                // Use PHP API with session cookies
                const response = await fetch('/buyer/api/my-bids.php', {
                    credentials: 'include' // Send cookies for PHP session
                });
                const result = await response.json();
                data = result.data || result;
            }

            setBids(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading bids:', err);
            setError('Gagal memuat tawaran');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatTimeRemaining = (endTime) => {
        if (!endTime) return 'Belum mulai';

        const now = new Date();
        const endDate = new Date(endTime);
        const diff = endDate - now;

        if (diff <= 0) return 'Selesai';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}h ${hours % 24}j lagi`;
        }

        return `${hours}j ${minutes}m lagi`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'scheduled': return '#f59e0b';
            case 'ended': return '#6b7280';
            default: return '#3b82f6';
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                Memuat tawaran...
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: '0 0 8px 0', color: '#0A75BD', fontSize: '2rem', fontWeight: '700' }}>
                    💰 Tawaran Saya
                </h1>
                <p style={{ margin: 0, color: '#6b7280' }}>
                    Lihat semua lelang yang Anda ikuti
                </p>
            </div>

            {error && (
                <div style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}

            {bids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                        Belum ada tawaran aktif
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                        Jelajahi lelang dan mulai menawar
                    </div>
                    <button
                        onClick={() => navigate('/auction')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#0A75BD',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Lihat Lelang
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    {bids.map((bid) => {
                        const isWinning = bid.user_highest_bid >= bid.current_price;

                        return (
                            <div
                                key={bid.auction_id}
                                onClick={() => navigate(`/auction/${bid.auction_id}`)}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: isWinning ? '2px solid #10b981' : '1px solid #e0e0e0',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                }}
                            >
                                {/* Image */}
                                <div style={{
                                    width: '100%',
                                    height: '180px',
                                    backgroundColor: '#f3f4f6',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <img
                                        src={bid.main_image_path || '/assets/images/default.png'}
                                        alt={bid.product_name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    {/* Status Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        padding: '4px 12px',
                                        backgroundColor: getStatusColor(bid.status),
                                        color: 'white',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        textTransform: 'capitalize'
                                    }}>
                                        {bid.status}
                                    </div>
                                    {/* Winning Badge */}
                                    {isWinning && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            left: '8px',
                                            padding: '4px 12px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            🏆 Tertinggi
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ padding: '16px' }}>
                                    {/* Store Name */}
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        marginBottom: '4px'
                                    }}>
                                        {bid.store_name}
                                    </div>

                                    {/* Product Name */}
                                    <h3 style={{
                                        margin: '0 0 12px 0',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#333',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {bid.product_name}
                                    </h3>

                                    {/* Prices */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '4px'
                                        }}>
                                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                Harga sekarang
                                            </span>
                                            <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0A75BD' }}>
                                                {formatCurrency(bid.current_price)}
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                Tawaran Anda
                                            </span>
                                            <span style={{
                                                fontSize: '0.95rem',
                                                fontWeight: '600',
                                                color: isWinning ? '#10b981' : '#6b7280'
                                            }}>
                                                {formatCurrency(bid.user_highest_bid)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Time Remaining */}
                                    <div style={{
                                        paddingTop: '12px',
                                        borderTop: '1px solid #e0e0e0',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: bid.status === 'active' ? '#10b981' : '#6b7280',
                                        textAlign: 'center'
                                    }}>
                                        {formatTimeRemaining(bid.end_time)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyBids;
