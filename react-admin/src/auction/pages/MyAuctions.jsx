import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSellerAuctions, deleteAuction } from '../api/auctionApi';

const MyAuctions = () => {
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadAuctions();
    }, []);

    const loadAuctions = async () => {
        try {
            setLoading(true);
            setError('');

            // Check if user has React admin token or using PHP session
            const token = localStorage.getItem('adminToken');
            let data;

            if (token) {
                // Use React fetch with JWT token
                data = await fetchSellerAuctions(token);
            } else {
                // Use PHP API with session cookies
                const response = await fetch('/seller/api/my-auctions.php', {
                    credentials: 'include'
                });
                const result = await response.json();
                data = result.data || result;
            }

            setAuctions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading auctions:', err);
            setError('Gagal memuat lelang');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (auctionId) => {
        if (!window.confirm('Yakin ingin menghapus lelang ini?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            if (token) {
                await deleteAuction(auctionId, token);
            } else {
                const response = await fetch('/seller/api/delete-auction.php', {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ auction_id: auctionId })
                });
                if (!response.ok) throw new Error('Failed to delete');
            }
            alert('Lelang berhasil dihapus');
            loadAuctions();
        } catch (err) {
            alert('Gagal menghapus lelang: ' + (err.message || 'Unknown error'));
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'scheduled': return '#f59e0b';
            case 'ended': return '#6b7280';
            case 'cancelled': return '#ef4444';
            default: return '#3b82f6';
        }
    };

    const filteredAuctions = auctions.filter(auction => {
        if (filter === 'all') return true;
        return auction.status === filter;
    });

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                Memuat lelang...
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', color: '#0A75BD', fontSize: '2rem', fontWeight: '700' }}>
                        🔨 Lelang Saya
                    </h1>
                    <p style={{ margin: 0, color: '#6b7280' }}>
                        Kelola lelang produk Anda
                    </p>
                </div>
                <button
                    onClick={() => navigate('/seller/auction/create')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#0A75BD',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    + Buat Lelang Baru
                </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', borderBottom: '2px solid #e0e0e0' }}>
                {['all', 'active', 'scheduled', 'ended'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        style={{
                            padding: '12px 20px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: filter === status ? '3px solid #0A75BD' : '3px solid transparent',
                            color: filter === status ? '#0A75BD' : '#6b7280',
                            fontWeight: filter === status ? '600' : '400',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            marginBottom: '-2px'
                        }}
                    >
                        {status === 'all' ? 'Semua' : status}
                    </button>
                ))}
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

            {filteredAuctions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                        {filter === 'all' ? 'Belum ada lelang' : `Tidak ada lelang ${filter}`}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                        {filter === 'all' && 'Buat lelang baru untuk memulai'}
                    </div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e0e0e0' }}>
                                <th style={{ textAlign: 'left', padding: '16px', fontWeight: '600', color: '#333' }}>Produk</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontWeight: '600', color: '#333' }}>Harga Mulai</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontWeight: '600', color: '#333' }}>Harga Saat Ini</th>
                                <th style={{ textAlign: 'center', padding: '16px', fontWeight: '600', color: '#333' }}>Tawaran</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontWeight: '600', color: '#333' }}>Waktu Mulai</th>
                                <th style={{ textAlign: 'center', padding: '16px', fontWeight: '600', color: '#333' }}>Status</th>
                                <th style={{ textAlign: 'center', padding: '16px', fontWeight: '600', color: '#333' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAuctions.map((auction) => (
                                <tr key={auction.auction_id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img
                                                src={auction.main_image_path || '/assets/images/default.png'}
                                                alt={auction.product_name}
                                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                    {auction.product_name}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                    Qty: {auction.quantity}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#333' }}>
                                        {formatCurrency(auction.starting_price)}
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '600', color: '#0A75BD' }}>
                                        {formatCurrency(auction.current_price)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                                        {auction.bid_count || 0}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.9rem', color: '#6b7280' }}>
                                        {formatDate(auction.start_time)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            backgroundColor: `${getStatusColor(auction.status)}20`,
                                            color: getStatusColor(auction.status),
                                            textTransform: 'capitalize'
                                        }}>
                                            {auction.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => navigate(`/auction/${auction.auction_id}`)}
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#0A75BD',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Lihat
                                            </button>
                                            {auction.status === 'scheduled' && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/seller/auction/${auction.auction_id}/edit`)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            backgroundColor: '#f59e0b',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(auction.auction_id)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        Hapus
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyAuctions;
