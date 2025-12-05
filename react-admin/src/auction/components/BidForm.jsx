import { useState } from 'react';

const BidForm = ({ auction, onBidSubmit, loading = false }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');

  const minBidAmount = auction.current_price === 0 
    ? auction.starting_price 
    : auction.current_price + auction.min_increment;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amount = parseInt(bidAmount);

    if (!bidAmount || bidAmount <= 0) {
      setError('Masukkan jumlah bid yang valid');
      return;
    }

    if (amount < minBidAmount) {
      setError(`Bid minimal ${formatCurrency(minBidAmount)}`);
      return;
    }

    onBidSubmit(amount);
    setBidAmount('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Letakkan Penawaran</h3>

      {auction.status !== 'active' && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '0.9rem'
          }}
        >
          ⚠️ Lelang tidak aktif. Status: <strong>{auction.status}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
            Jumlah Penawaran
          </label>
          <div
            style={{
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Min: ${formatCurrency(minBidAmount)}`}
              disabled={auction.status !== 'active' || loading}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0A75BD';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
              }}
            />
            <button
              type="submit"
              disabled={auction.status !== 'active' || loading}
              style={{
                padding: '12px 24px',
                backgroundColor: auction.status === 'active' ? '#0A75BD' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: auction.status === 'active' && !loading ? 'pointer' : 'not-allowed',
                opacity: auction.status === 'active' && !loading ? 1 : 0.7,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (auction.status === 'active' && !loading) {
                  e.target.style.backgroundColor = '#085f9a';
                }
              }}
              onMouseLeave={(e) => {
                if (auction.status === 'active' && !loading) {
                  e.target.style.backgroundColor = '#0A75BD';
                }
              }}
            >
              {loading ? 'Memproses...' : 'Bid'}
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '6px' }}>
            Penawaran minimal: <strong>{formatCurrency(minBidAmount)}</strong>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}
          >
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default BidForm;
