import { useEffect, useState } from 'react';  
import { useNavigate } from 'react-router-dom';  
import { fetchSellerAuctions } from '../api/auctionApi';  
import AuctionCard from '../components/AuctionCard';
import { useWebSocket } from '../../shared/hooks/useWebSocket';  

const AuctionManagement = () => {  
  const navigate = useNavigate();  
  const { lastMessage } = useWebSocket();
  const [auctions, setAuctions] = useState([]);  
  const [loading, setLoading] = useState(true);  
  const [error, setError] = useState('');  
  const [searchQuery, setSearchQuery] = useState('');  
  const [debouncedSearch, setDebouncedSearch] = useState('');  

  useEffect(() => {  
    checkFeatureFlag();
    loadAuctions();  
  }, [debouncedSearch]);

  // (kenan) Listen for feature disable event
  useEffect(() => {
    if (lastMessage?.type === 'feature_disabled') {
      const reason = lastMessage.reason || 'Fitur lelang sedang dinonaktifkan';
      window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
    }
  }, [lastMessage]);
  // udah  

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
  };  

  // Debounce search  
  useEffect(() => {  
    const timer = setTimeout(() => {  
      setDebouncedSearch(searchQuery);  
    }, 500);  
    return () => clearTimeout(timer);  
  }, [searchQuery]);  

  const loadAuctions = async () => {  
    try {  
        setLoading(true);  
        setError('');  
        const token = localStorage.getItem('adminToken');  
        if (!token) throw new Error('Token not found');  

        const data = await fetchSellerAuctions(token); 
        console.log('Seller auctions:', data); 

        // (kenan) Check if response indicates feature is disabled
        if (data && (data.feature_disabled || data.error)) {
            const reason = data.message || data.error || 'Fitur lelang sedang dinonaktifkan';
            window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
            return;
        }
        // udah

        if (!Array.isArray(data)) {
            throw new Error('Server returned non-array data');
        }

        const filtered = data.filter(a =>  
        !debouncedSearch ||  
        a.product_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||  
        a.store_name.toLowerCase().includes(debouncedSearch.toLowerCase())  
        );  
        setAuctions(filtered);  
    } catch (err) {  
        // (kenan) Check various error response formats for feature_disabled
        if (err.feature_disabled || err.error === 'Feature disabled') {
            // Message sudah di-format dengan benar dari API layer
            const reason = err.message || 'Fitur lelang sedang dinonaktifkan';
            window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
            return;
        }
        // udah
        console.error(err);  
        setError(err.message || 'Gagal memuat lelang');  
        setAuctions([]);
    } finally {  
        setLoading(false);  
    }  
    };


  // (kenan) Check feature flag sebelum navigate
  const handleCardClick = async (auctionId) => {
    try {
      const response = await fetch('/api/features/check?feature=auction_enabled', {
        credentials: 'include'
      });
      const data = await response.json();
      if (!data.enabled) {
        const reason = data.reason || 'Fitur lelang sedang dinonaktifkan';
        window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
      } else {
        navigate(`/auction/${auctionId}`);
      }
    } catch (error) {
      console.error('Failed to check feature flag:', error);
      navigate(`/auction/${auctionId}`); // Fallback
    }
  };
  // udah  

  return (  
    <div className="p-5 max-w-7xl mx-auto">  
      <div className="mb-8">  
        <h1 className="text-3xl font-bold text-brand mb-2">⚙️ Kelola Lelang</h1>  
        <p className="text-gray-500 m-0">Lihat semua lelang yang Anda buat</p>  
      </div>  

      {/* Search */}
      <div className="relative w-full md:w-72 mb-6">  
        <input  
          type="text"  
          placeholder="Cari produk..."  
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

      {error && (  
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5">  
          {error}  
        </div>  
      )}  

      {loading ? (  
        <div className="text-center py-16 text-gray-500">Memuat lelang...</div>  
      ) : auctions.length === 0 ? (  
        <div className="text-center py-16 text-gray-500">Tidak ada lelang</div>  
      ) : (  
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">  
          {auctions.map((auction) => (  
            <div key={auction.auction_id} onClick={() => handleCardClick(auction.auction_id)} className="cursor-pointer">  
              <AuctionCard auction={auction} isSellerView />  
            </div>  
          ))}  
        </div>  
      )}  
    </div>  
  );  
};  

export default AuctionManagement;
