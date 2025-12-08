import { useEffect, useState } from 'react';
import { fetchBidHistory } from '../api/auctionApi';
import { useWebSocket } from '../../shared/hooks/useWebSocket';

const BidHistory = ({ auctionId }) => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const { lastMessage, isConnected } = useWebSocket();
  const currentUserName = localStorage.getItem('adminName') || localStorage.getItem('userName');

  useEffect(() => {
    loadBidHistory();
  }, [auctionId, limit]);

  useEffect(() => {
    if (
      lastMessage?.type === 'auction_bid_update' &&
      lastMessage.auction_id === parseInt(auctionId)
    ) {
      const newBid = {
        bidder_name: lastMessage.bidder_name,
        bid_amount: lastMessage.current_price,
        bid_time: lastMessage.timestamp
      };

      setBids(prev => [newBid, ...prev.slice(0, limit - 1)]);
      loadBidHistory(); 
    }
  }, [lastMessage, auctionId, limit]);

  const loadBidHistory = async () => {
    try {
      // Don't set loading on refresh to avoid flickering
      if (bids.length === 0) setLoading(true);

      const bidData = await fetchBidHistory(auctionId, limit);
      setBids(Array.isArray(bidData) ? bidData : []);
    } catch (error) {
      console.error('Error loading bid history:', error);
      setBids([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 10);
  };

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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(dateString));
  };

  const uniqueBidders = new Set(bids.map(b => b.bidder_id)).size;

  if (loading && bids.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
        Memuat riwayat penawaran...
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
        Belum ada penawaran untuk lelang ini
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Riwayat Penawaran</h3>
          <div className="text-sm text-gray-500">
            {isConnected && <span className="text-emerald-500 font-bold">● </span>}
            Total: {bids.length} penawaran
          </div>
        </div>
        <div className="text-sm font-medium text-brand bg-blue-50 px-3 py-1 rounded-lg">
          {uniqueBidders} Penawar Unik
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left p-3 text-gray-500 font-semibold text-sm">
                Penawar
              </th>
              <th className="text-right p-3 text-gray-500 font-semibold text-sm">
                Jumlah
              </th>
              <th className="text-right p-3 text-gray-500 font-semibold text-sm">
                Waktu
              </th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid, index) => {
              const isMyBid = bid.bidder_name === currentUserName;
              return (
                <tr
                  key={bid.bid_id || index}
                  className={`border-b border-gray-200 ${isMyBid ? 'bg-blue-50' : (index === 0 ? 'bg-green-50' : 'bg-white')}`}
                >
                  <td className="p-3 text-gray-800">
                    <div className="font-semibold flex items-center gap-2">
                      {bid.bidder_name}
                      {isMyBid && <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full">Anda</span>}
                    </div>
                    <div className="text-xs text-gray-500">{bid.bidder_email}</div>
                  </td>
                  <td className="p-3 text-right text-brand font-bold">
                    {formatCurrency(bid.bid_amount)}
                  </td>
                  <td className="p-3 text-right text-sm text-gray-500">
                    {formatDate(bid.bid_time)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={handleLoadMore}
          className="text-sm text-brand font-semibold hover:underline cursor-pointer"
        >
          Muat Lebih Banyak
        </button>
      </div>

      {isConnected && (
        <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Terhubung ke update real-time
        </div>
      )}
    </div>
  );
};

export default BidHistory;
