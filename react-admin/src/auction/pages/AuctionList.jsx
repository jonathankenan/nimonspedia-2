import { useEffect, useState } from 'react';
import { fetchAuctions } from '../api/auctionApi';
import AuctionCard from '../components/AuctionCard';

const AuctionList = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 12;

  useEffect(() => {
    loadAuctions();
  }, [offset]);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchAuctions(LIMIT, offset);
      const data = response.data || response;
      
      if (offset === 0) {
        setAuctions(data);
      } else {
        setAuctions(prev => [...prev, ...data]);
      }
      
      setHasMore(data.length === LIMIT);
    } catch (err) {
      console.error('Error loading auctions:', err);
      setError('Gagal memuat lelang');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setOffset(prev => prev + LIMIT);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#0A75BD', fontSize: '2rem', fontWeight: '700' }}>
          🔨 Lelang Aktif
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Jelajahi produk yang tersedia untuk dilelang
        </p>
      </div>

      {error && (
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
      )}

      {loading && offset === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <div style={{ marginBottom: '16px' }}>Memuat lelang...</div>
        </div>
      ) : auctions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Belum ada lelang aktif</div>
          <div style={{ fontSize: '0.9rem' }}>Coba kembali nanti</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}
          >
            {auctions.map((auction) => (
              <AuctionCard key={auction.auction_id} auction={auction} />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#0A75BD',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#085f9a';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#0A75BD';
                }}
              >
                {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuctionList;
