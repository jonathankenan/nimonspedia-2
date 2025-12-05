import { useEffect, useState } from 'react';
import { fetchBidHistory } from '../api/auctionApi';
import { useWebSocket } from '../../shared/hooks/useWebSocket';

const BidHistory = ({ auctionId }) => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage, isConnected } = useWebSocket();

  useEffect(() => {
    loadBidHistory();
  }, [auctionId]);

  useEffect(() => {
    if (lastMessage?.type === 'auction_bid_update' && lastMessage.auction_id === parseInt(auctionId)) {
      loadBidHistory();
    }
  }, [lastMessage, auctionId]);

  const loadBidHistory = async () => {
    try {
      setLoading(true);
      const bidData = await fetchBidHistory(auctionId);
      setBids(Array.isArray(bidData) ? bidData : []);
    } catch (error) {
      console.error('Error loading bid history:', error);
      setBids([]);
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

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
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
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#333' }}>Riwayat Penawaran</h3>
        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          {isConnected && <span style={{ color: '#10b981', fontWeight: '600' }}>● </span>}
          Total: {bids.length} penawaran
        </div>
      </div>

      <div style={{ overflow: 'x-auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontWeight: '600', fontSize: '0.9rem' }}>
                Penawar
              </th>
              <th style={{ textAlign: 'right', padding: '12px', color: '#6b7280', fontWeight: '600', fontSize: '0.9rem' }}>
                Jumlah
              </th>
              <th style={{ textAlign: 'right', padding: '12px', color: '#6b7280', fontWeight: '600', fontSize: '0.9rem' }}>
                Waktu
              </th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid, index) => (
              <tr
                key={bid.bid_id || index}
                style={{
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: index === 0 ? '#f0fdf4' : 'white'
                }}
              >
                <td style={{ padding: '12px', color: '#333' }}>
                  <div style={{ fontWeight: '600' }}>{bid.bidder_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{bid.bidder_email}</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0A75BD', fontWeight: '600' }}>
                  {formatCurrency(bid.bid_amount)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.9rem', color: '#6b7280' }}>
                  {formatDate(bid.bid_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isConnected && (
        <div style={{
          marginTop: '16px',
          padding: '8px 12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#166534'
        }}>
          ✓ Terhubung ke update real-time
        </div>
      )}
    </div>
  );
};

export default BidHistory;
