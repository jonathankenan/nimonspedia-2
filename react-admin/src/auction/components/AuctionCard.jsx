import { useNavigate } from 'react-router-dom';
import { useCountdown } from '../hooks/useCountdown';

const AuctionCard = ({ auction }) => {
  const navigate = useNavigate();
  const {
    auction_id,
    product_name,
    main_image_path,
    starting_price,
    current_price,
    end_time,
    start_time,
    status,
    store_name,
    bid_count
  } = auction;

  const targetTime = status === 'scheduled' ? start_time : end_time;
  const { formattedTime } = useCountdown(targetTime);

  const handleClick = () => {
    navigate(`/auction/${auction_id}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTimeLabel = () => {
    if (status === 'scheduled') return 'Mulai dalam';
    if (status === 'ended') return 'Berakhir';
    if (status === 'cancelled') return 'Dibatalkan';
    return 'Berakhir dalam';
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'scheduled':
        return '#f59e0b';
      case 'ended':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image Section */}
      <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
        <img
          src={main_image_path || '/assets/images/default.png'}
          alt={product_name}
          className="w-full h-full object-cover"
        />
        {/* Status Badge */}
        <div
          className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold text-white capitalize`}
          style={{ backgroundColor: getStatusColor() }}
        >
          {status}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Store Name */}
        <div className="text-xs text-gray-500 mb-1">
          {store_name}
        </div>

        {/* Product Name */}
        <h3 className="text-base font-semibold text-gray-800 mb-2 truncate">
          {product_name}
        </h3>

        {/* Price Section */}
        <div className="mb-3">
          <div className="text-sm text-gray-500 mb-0.5">
            Harga sekarang
          </div>
          <div className="text-xl font-bold text-brand">
            {formatCurrency(current_price || starting_price)}
          </div>
        </div>

        {/* Bids & Time */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-sm">
          <div className="text-gray-500">
            {bid_count || 0} bid{bid_count !== 1 ? 's' : ''}
          </div>
          <div
            className={`font-semibold ${status === 'active' ? 'text-emerald-500' : 'text-gray-500'}`}
          >
            {getTimeLabel()}: {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
