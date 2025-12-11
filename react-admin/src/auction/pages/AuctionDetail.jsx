import { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import { confirmToast } from '../../shared/utils/confirmToast';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuctionDetail, placeBid, cancelAuction, stopAuction, editAuction } from '../api/auctionApi';
import BidForm from '../components/BidForm';
import BidHistory from '../components/BidHistory';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { useCountdown } from '../hooks/useCountdown';
import { useAuctionCountdown } from '../hooks/useAuctionCountdown';

const AuctionDetail = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidding, setBidding] = useState(false);
  const { lastMessage } = useWebSocket();
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState(null);
  const [hasStopped, setHasStopped] = useState(false);

  // Edit State
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    starting_price: auction?.starting_price || '',
    min_increment: auction?.min_increment || ''
  });

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

  const handleAutoStop = async () => {
    if (hasStopped) return;
    setHasStopped(true);

    try {
      await stopAuction(auction.auction_id, localStorage.getItem('adminToken'));
      setAuction(prev => ({ ...prev, status: 'ended' }));
      await loadAuctionDetail();
    } catch (err) { console.error(err); }
  };

  const shouldStartCountdown = auction?.status === 'active' && auction.bid_count > 0;

  const bidTargetTime = auction?.last_bid_time
    ? new Date(auction.last_bid_time).getTime() + 15000
    : new Date().getTime() + 15000;

  const { seconds, formattedTime: activeCountdown, reset: resetCountdown } = useAuctionCountdown(
    bidTargetTime,
    async () => {
      if (hasStopped) return;
      setHasStopped(true);
      try {
        // stop auction otomatis
        await stopAuction(auction.auction_id, localStorage.getItem('adminToken'));
        // update UI
        setAuction(prev => ({ ...prev, status: 'ended' }));
        // reload detail kalau perlu
        await loadAuctionDetail();
      } catch (err) {
        console.error('Gagal menghentikan lelang otomatis:', err);
      }
    },
    true 
  );

  useEffect(() => {
    loadAuctionDetail();
  }, [auctionId]);

  useEffect(() => {
    if (lastMessage) {
      console.log("Received WS message:", lastMessage);
    }
  }, [lastMessage]);

  // Real-time update via WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'auction_bid_update' && lastMessage.auction_id === parseInt(auctionId)) {
      resetCountdown(); 
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

  useEffect(() => {
      loadBalance();
  }, []);

  useEffect(() => {
      if (lastMessage?.type === 'balance_update' && lastMessage.user_id === userId) {
          setBalance(lastMessage.balance);
      }
  }, [lastMessage, userId]);

  useEffect(() => {
    if (lastMessage?.type === 'auction_stopped' && lastMessage.auction_id === parseInt(auctionId)) {
      setAuction(prev => ({ ...prev, status: 'ended' }));
      toast.success('Lelang telah dihentikan');
    }
  }, [lastMessage, auctionId]);

  useEffect(() => {
    if (lastMessage?.type === 'auction_cancelled' && lastMessage.auction_id === parseInt(auctionId)) {
      setAuction(prev => ({ ...prev, status: 'cancelled' }));
      toast.success('Lelang telah dibatalkan');
    }
  }, [lastMessage, auctionId]);

  useEffect(() => {
    if (lastMessage?.type === 'auction_updated' && lastMessage.auction_id === parseInt(auctionId)) {
      setAuction(prev => ({
        ...prev,
        starting_price: lastMessage.starting_price ?? prev.starting_price,
        min_increment: lastMessage.min_increment ?? prev.min_increment,
      }));
    }
  }, [lastMessage, auctionId]);

  const loadBalance = async () => {
      try {
          let bal = 0;

          // fetch dari PHP session
          const res = await fetch('/api/user-balance.php', {
              credentials: 'include'
          });
          const data = await res.json();
          bal = data.balance ?? 0;
          if (data.user_id) {
            setUserId(data.user_id); // simpan di state
          }
          setBalance(bal);
      } catch (err) {
          console.error('Gagal load balance:', err);
      }
  };

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
    const token = localStorage.getItem('adminToken'); // optional, kalau pakai token

    try {
      setBidding(true);
      await placeBid(auction.auction_id, bidAmount, token);
      toast.success('Penawaran berhasil ditempatkan!');
      loadAuctionDetail(); // refresh current price & bid history
    } catch (err) {
      toast.error(`Gagal menempatkan penawaran: ${err.error || err.message || 'Unknown error'}`);
      console.error('Error placing bid:', err);
    } finally {
      setBidding(false);
    }
  };

  const handleCancelAuction = async () => {
    confirmToast('Apakah Anda yakin ingin membatalkan lelang ini?', async () => {
      const token = localStorage.getItem('adminToken');
      try {
        await cancelAuction(auction.auction_id, token);
        loadAuctionDetail();
        toast.success('Lelang berhasil dibatalkan');
      } catch (err) {
        toast.error('Gagal membatalkan lelang');
        console.error(err);
      }
    });
  };

  const handleStopAuction = async () => {
    confirmToast('Apakah Anda yakin ingin menghentikan lelang ini sekarang? Pemenang saat ini akan menang.', async () => {
      const token = localStorage.getItem('adminToken');
      try {
        await stopAuction(auction.auction_id, token);
        loadAuctionDetail();
        toast.success('Lelang berhasil dihentikan');
      } catch (err) {
        toast.error(`Gagal menghentikan lelang: ${err.error || err.message || 'Unknown error'}`);
        console.error(err);
      }
    });
  };

  // Edit Handlers
  const handleEditClick = () => {
    setEditForm({
      starting_price: auction?.starting_price,
      min_increment: auction?.min_increment
    });
    setEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    try {
      await editAuction({
        auction_id: auction.auction_id,
        starting_price: parseFloat(editForm.starting_price),
        min_increment: parseFloat(editForm.min_increment),
      }, token);

      toast.success('Lelang berhasil diperbarui');
      setEditing(false);
      loadAuctionDetail();
    } catch (err) {
      toast.error(`Gagal memperbarui lelang: ${err.error || err.message}`);
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
        <span
          onClick={() => {
            const role = localStorage.getItem('userRole');
            if (role === 'SELLER') {
              navigate('/auction/management');
            } else {
              navigate('/auction');
            }
          }}
          className="cursor-pointer text-brand hover:underline"
        >
          ← Kembali ke Lelang
        </span>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit Lelang</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Mulai</label>
                <input
                  type="number"
                  value={editForm.starting_price}
                  onChange={e => setEditForm({ ...editForm, starting_price: e.target.value })}
                  className="w-full p-2 border rounded"
                  min="1000"
                  step="1000"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Increment Minimal</label>
                <input
                  type="number"
                  value={editForm.min_increment}
                  onChange={e => setEditForm({ ...editForm, min_increment: e.target.value })}
                  className="w-full p-2 border rounded"
                  min="1000"
                  step="1000"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={4}
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div className="text-sm text-gray-500 mb-1">Toko</div>
              <div className="text-lg font-semibold text-gray-800">
                {userRole === 'BUYER' ? (
                  <a
                    href={`http://localhost:8080/store/detail.php?id=${auction.store_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {auction.store_name}
                  </a>
                ) : (
                  auction.store_name
                )}
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
                  {auction.status === 'active' ? activeCountdown : formattedTime}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <div>Mulai: {formatDate(auction.start_time)}</div>
            </div>
          </div>

          {/* Seller Controls */}
          {isOwner && (
            <div className="bg-white rounded-xl p-5 mb-5 border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-3">Kontrol Penjual</h3>
              <div className="flex gap-3 flex-wrap">
                {/* Edit Button - Only if no bids and active/scheduled */}
                {(auction.status === 'active' || auction.status === 'scheduled') && (!auction.bid_count || auction.bid_count === 0) && (
                  <button
                    onClick={handleEditClick}
                    disabled={auction.status === 'stopped'}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                  >
                    Edit Lelang
                  </button>
                )}

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
          {!isSeller && auction.status === 'active' && (
            <BidForm
              auction={auction}
              onBidSubmit={handleBidSubmit}
              loading={bidding}
              balance={balance}
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