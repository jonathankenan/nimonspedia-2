import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { fetchAuctions, fetchSellerActiveAuction } from '../api/auctionApi';
import AuctionCard from '../components/AuctionCard';

const AuctionList = () => {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'scheduled'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { lastMessage } = useWebSocket();

  const LIMIT = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setOffset(0); // Reset pagination on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when tab changes
  useEffect(() => {
    setOffset(0);
  }, [activeTab]);

  // Load auctions
  useEffect(() => {
      loadAuctions();
  }, [offset, activeTab, debouncedSearch]);

  // Handle live update: new auction
  useEffect(() => {
    if (lastMessage?.type === 'auction_created') {
      // Masukkan auction baru ke list jika sesuai tab saat ini
      if (lastMessage.status === activeTab) {
        setAuctions(prev => [lastMessage, ...prev]);
      }
    }
  }, [lastMessage, activeTab]);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError('');

      // fetch tanpa status
      const response = await fetchAuctions(LIMIT, offset, {
        search: debouncedSearch
      });

      console.log(response);

      const data = response.data || response;

      // Tentukan status real-time client-side
      const filteredData = data
        // pastikan hanya yang active/scheduled
        .filter(a => a.status === 'active' || a.status === 'scheduled')
        .filter(a => a.status === activeTab &&
          (!debouncedSearch ||
            a.product_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            a.store_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        );

      console.log(filteredData);
      
      if (offset === 0) {
        setAuctions(filteredData);
      } else {
        setAuctions(prev => [...prev, ...filteredData]);
      }

      setHasMore(filteredData.length === LIMIT);
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
    <div className="p-5 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand mb-2">
          Daftar Lelang
        </h1>
        <p className="text-gray-500 m-0">
          Jelajahi produk yang tersedia untuk dilelang
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'active'
              ? 'bg-white text-brand shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sedang Berlangsung
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'scheduled'
              ? 'bg-white text-brand shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Akan Datang
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Cari produk atau toko..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
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
          <div className="text-lg mb-2">
            {activeTab === 'active'
              ? 'Tidak ada lelang yang sedang berlangsung'
              : 'Tidak ada lelang yang dijadwalkan'}
          </div>
          <div className="text-sm">Coba ubah kata kunci pencarian atau cek tab lain</div>
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
