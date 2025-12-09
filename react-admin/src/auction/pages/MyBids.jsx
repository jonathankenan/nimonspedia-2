import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserActiveBids } from '../api/auctionApi';

const MyBids = () => {
    const navigate = useNavigate();
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        checkFeatureFlag();
        loadBids();
    }, []);

        const checkFeatureFlag = async () => {
            try {
                const response = await fetch('/api/features/check?feature=auction_enabled', {
                    credentials: 'include'
                });
                const data = await response.json();
                if (!data.enabled) {
                    const reason = data.reason || 'Fitur lelang sedang dinonaktifkan';
                    window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
                }
            } catch (error) {
                console.error('Failed to check feature flag:', error);
            }
        };    const loadBids = async () => {
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
                
                if (result.feature_disabled) {
                    const reason = result.message || 'Fitur lelang sedang dinonaktifkan';
                    window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
                    return;
                }
                
                data = result.data || result;
            }

            setBids(Array.isArray(data) ? data : []);
        } catch (err) {
            if (err.response?.data?.feature_disabled || err.feature_disabled) {
                const reason = err.response?.data?.message || err.message || 'Fitur lelang sedang dinonaktifkan';
                window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
                return;
            }
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
        <div className="p-5">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-brand mb-2">
                    💰 Tawaran Saya
                </h1>
                <p className="m-0 text-gray-500">
                    Lihat semua lelang yang Anda ikuti
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5">
                    {error}
                </div>
            )}

            {bids.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <div className="text-lg mb-2">
                        Belum ada tawaran aktif
                    </div>
                    <div className="text-sm mb-4">
                        Jelajahi lelang dan mulai menawar
                    </div>
                    <button
                        onClick={() => navigate('/auction')}
                        className="px-6 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-[#085f9a] transition-colors"
                    >
                        Lihat Lelang
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {bids.map((bid) => {
                        const isWinning = bid.user_highest_bid >= bid.current_price;

                        return (
                            <div
                                key={bid.auction_id}
                                onClick={() => navigate(`/auction/${bid.auction_id}`)}
                                className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${isWinning ? 'border-2 border-emerald-500' : 'border border-gray-200'
                                    }`}
                            >
                                {/* Image */}
                                <div className="w-full h-48 bg-gray-100 relative">
                                    <img
                                        src={bid.main_image_path || '/assets/images/default.png'}
                                        alt={bid.product_name}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Status Badge */}
                                    <div
                                        className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                                        style={{ backgroundColor: getStatusColor(bid.status) }}
                                    >
                                        {bid.status}
                                    </div>
                                    {/* Winning Badge */}
                                    {isWinning && (
                                        <div className="absolute top-2 left-2 px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold">
                                            🏆 Tertinggi
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    {/* Store Name */}
                                    <div className="text-xs text-gray-500 mb-1">
                                        {bid.store_name}
                                    </div>

                                    {/* Product Name */}
                                    <h3 className="text-base font-semibold text-gray-800 mb-3 truncate">
                                        {bid.product_name}
                                    </h3>

                                    {/* Prices */}
                                    <div className="mb-3">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm text-gray-500">
                                                Harga sekarang
                                            </span>
                                            <span className="text-base font-bold text-brand">
                                                {formatCurrency(bid.current_price)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">
                                                Tawaran Anda
                                            </span>
                                            <span className={`text-sm font-semibold ${isWinning ? 'text-emerald-500' : 'text-gray-500'}`}>
                                                {formatCurrency(bid.user_highest_bid)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Time Remaining */}
                                    <div className={`pt-3 border-t border-gray-200 text-sm font-semibold text-center ${bid.status === 'active' ? 'text-emerald-500' : 'text-gray-500'
                                        }`}>
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
