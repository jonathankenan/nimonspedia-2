import { useNavigate } from 'react-router-dom';

const AuctionCard = ({ auction }) => {
  const navigate = useNavigate();
  const {
    auction_id,
    product_name,
    main_image_path,
    starting_price,
    current_price,
    end_time,
    status,
    store_name,
    bid_count
  } = auction;

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

  const timeRemaining = () => {
    if (!end_time) return 'Belum mulai';
    
    const now = new Date();
    const endDate = new Date(end_time);
    const diff = endDate - now;

    if (diff <= 0) return 'Selesai';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}h ${hours % 24}j lagi`;
    }

    return `${hours}j ${minutes}m lagi`;
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
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        backgroundColor: 'white'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      {/* Image Section */}
      <div
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: '#f3f4f6',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <img
          src={main_image_path || '/assets/images/default.png'}
          alt={product_name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        {/* Status Badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '4px 12px',
            backgroundColor: getStatusColor(),
            color: 'white',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'capitalize'
          }}
        >
          {status}
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '16px' }}>
        {/* Store Name */}
        <div
          style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginBottom: '4px'
          }}
        >
          {store_name}
        </div>

        {/* Product Name */}
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {product_name}
        </h3>

        {/* Price Section */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '2px' }}>
            Harga sekarang
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#0A75BD'
            }}
          >
            {formatCurrency(current_price || starting_price)}
          </div>
        </div>

        {/* Bids & Time */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ color: '#6b7280' }}>
            {bid_count || 0} bid{bid_count !== 1 ? 's' : ''}
          </div>
          <div
            style={{
              fontWeight: '600',
              color: status === 'active' ? '#10b981' : '#6b7280'
            }}
          >
            {timeRemaining()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
