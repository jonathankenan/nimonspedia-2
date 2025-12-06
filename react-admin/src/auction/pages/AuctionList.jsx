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
    <div className="p-5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand mb-2">
          🔨 Lelang Aktif
        </h1>
        <p className="text-gray-500 m-0">
          Jelajahi produk yang tersedia untuk dilelang
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5">
          {error}
        </div>
      )}

      {loading && offset === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="mb-4">Memuat lelang...</div>
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-lg mb-2">Belum ada lelang aktif</div>
          <div className="text-sm">Coba kembali nanti</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
            {auctions.map((auction) => (
              <AuctionCard key={auction.auction_id} auction={auction} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-8 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-[#085f9a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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
