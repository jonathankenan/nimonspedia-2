import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuctionDetail, placeBid } from '../api/auctionApi';
import BidForm from '../components/BidForm';
import BidHistory from '../components/BidHistory';

const AuctionDetail = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidding, setBidding] = useState(false);

  useEffect(() => {
    loadAuctionDetail();
  }, [auctionId]);

  const loadAuctionDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchAuctionDetail(auctionId);
      setAuction(data);
    } catch (err) {
      setError('Gagal memuat detail lelang');
      console.error('Error loading auction:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBidSubmit = async (bidAmount) => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      alert('Silakan login terlebih dahulu');
      navigate('/login');
      return;
    }

    try {
      setBidding(true);
      await placeBid(auctionId, bidAmount, token);
      alert('Penawaran berhasil ditempatkan!');
      loadAuctionDetail();
    } catch (err) {
      alert(`Gagal menempatkan penawaran: ${err.error || err.message || 'Unknown error'}`);
      console.error('Error placing bid:', err);
    } finally {
      setBidding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
        Memuat detail lelang...
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}
        >
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0A75BD',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Kembali
        </button>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '20px', color: '#6b7280', fontSize: '0.9rem' }}>
        <span onClick={() => navigate('/auction')} style={{ cursor: 'pointer', color: '#0A75BD' }}>
          ← Kembali ke Lelang
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr'
          }
        }}
      >
        {/* Left Column - Image & Details */}
        <div>
          {/* Product Image */}
          <div
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '20px',
              height: '400px'
            }}
          >
            <img
              src={auction.main_image_path || '/assets/images/default.png'}
              alt={auction.product_name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Product Info */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ margin: '0 0 12px 0', color: '#333' }}>
              {auction.product_name}
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '4px' }}>
                Toko
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                {auction.store_name}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '4px' }}>
                Deskripsi
              </div>
              <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>
                {auction.description || 'Tidak ada deskripsi'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                    Harga Mulai
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                    {formatCurrency(auction.starting_price)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                    Min Increment
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                    {formatCurrency(auction.min_increment)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Bidding */}
        <div>
          {/* Price & Status Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '4px' }}>
                Harga Sekarang
              </div>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: '#0A75BD'
              }}>
                {formatCurrency(auction.current_price || auction.starting_price)}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                  Status
                </div>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: auction.status === 'active' ? '#f0fdf4' : '#f3f4f6',
                  borderRadius: '6px',
                  color: auction.status === 'active' ? '#166534' : '#6b7280',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {auction.status}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                  Kuantitas
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                  {auction.quantity} item
                </div>
              </div>
            </div>
          </div>

          {/* Bid Form */}
          <BidForm
            auction={auction}
            onBidSubmit={handleBidSubmit}
            loading={bidding}
          />

          {/* Bid History */}
          <div style={{ marginTop: '20px' }}>
            <BidHistory auctionId={auctionId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
