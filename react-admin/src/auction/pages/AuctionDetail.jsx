import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuctionDetail, placeBid, deleteAuction, stopAuction } from '../api/auctionApi';
import BidForm from '../components/BidForm';
import BidHistory from '../components/BidHistory';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { useCountdown } from '../hooks/useCountdown';

const AuctionDetail = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidding, setBidding] = useState(false);
  const { lastMessage } = useWebSocket();

  // User Info
  const userRole = localStorage.getItem('userRole');
  const adminName = localStorage.getItem('adminName') || localStorage.getItem('userName');
  const isSeller = userRole === 'SELLER';
  const isOwner = isSeller && auction?.seller_name === adminName;

  // Timer
  const targetTime = auction?.status === 'scheduled' ? auction.start_time : auction?.end_time;
  const { formattedTime, isEnded } = useCountdown(targetTime, () => {
    // Optional: Refresh when timer ends
    if (auction?.status === 'active') {
      loadAuctionDetail();
    }
  });

  useEffect(() => {
    loadAuctionDetail();
  }, [auctionId]);

  // Real-time update via WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'auction_bid_update' && lastMessage.auction_id === parseInt(auctionId)) {
      loadAuctionDetail();
    }
  }, [lastMessage, auctionId]);

  // Auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (auction?.status === 'active') {
        loadAuctionDetail();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [auction?.status]);

  const loadAuctionDetail = async () => {
    try {
      // Don't set loading=true to avoid flickering on real-time updates
      if (!auction) setLoading(true);

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

  const handleCancelAuction = async () => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan lelang ini?')) return;

    const token = localStorage.getItem('adminToken');
    try {
      await deleteAuction(auctionId, token);
      alert('Lelang berhasil dibatalkan');
      navigate('/auction');
    } catch (err) {
      alert('Gagal membatalkan lelang');
      console.error(err);
    }
  };

  const handleStopAuction = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghentikan lelang ini sekarang? Pemenang saat ini akan menang.')) return;

    const token = localStorage.getItem('adminToken');
    try {
      // Call stopAuction endpoint
      await stopAuction(auctionId, token);

      alert('Lelang berhasil dihentikan');
      loadAuctionDetail();
    } catch (err) {
      alert('Gagal menghentikan lelang');
      console.error(err);
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
    <div className="p-5 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-5 text-gray-500 text-sm">
        <span onClick={() => navigate('/auction')} className="cursor-pointer text-brand hover:underline">
          ← Kembali ke Lelang
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Image & Details */}
        <div>
          {/* Product Image */}
          <div className="bg-gray-100 rounded-xl overflow-hidden mb-5 h-96">
            <img
              src={auction.main_image_path || '/assets/images/default.png'}
              alt={auction.product_name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {auction.product_name}
            </h2>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">
                Toko
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {auction.store_name}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">
                Deskripsi
              </div>
              <p className="m-0 text-gray-600 leading-relaxed">
                {auction.description || 'Tidak ada deskripsi'}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Harga Mulai
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
                    {formatCurrency(auction.starting_price)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Min Increment
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
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
          <div className="bg-white rounded-xl p-5 mb-5">
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">
                Harga Sekarang
              </div>
              <div className="text-4xl font-bold text-brand">
                {formatCurrency(auction.current_price || auction.starting_price)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  Status
                </div>
                <div className={`inline-block px-3 py-2 rounded-md font-semibold capitalize ${auction.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {auction.status}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  {auction.status === 'scheduled' ? 'Mulai Dalam' : 'Berakhir Dalam'}
                </div>
                <div className={`text-lg font-bold ${auction.status === 'active' ? 'text-red-600' : 'text-gray-800'}`}>
                  {formattedTime}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <div>Mulai: {formatDate(auction.start_time)}</div>
              <div>Selesai: {formatDate(auction.end_time)}</div>
            </div>
          </div>

          {/* Seller Controls */}
          {isOwner && (
            <div className="bg-white rounded-xl p-5 mb-5 border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-3">Kontrol Penjual</h3>
              <div className="flex gap-3">
                {auction.status === 'active' && (
                  <button
                    onClick={handleStopAuction}
                    className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
                  >
                    Hentikan Lelang
                  </button>
                )}
                {(auction.status === 'active' || auction.status === 'scheduled') && (
                  <button
                    onClick={handleCancelAuction}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                  >
                    Batalkan Lelang
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bid Form (Only for Buyers) */}
          {!isSeller && (
            <BidForm
              auction={auction}
              onBidSubmit={handleBidSubmit}
              loading={bidding}
            />
          )}

          {/* Bid History */}
          <div className="mt-5">
            <BidHistory auctionId={auctionId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
