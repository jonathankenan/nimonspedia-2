import { useState } from 'react';

const BidForm = ({ auction, onBidSubmit, loading = false, balance }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');

  const minBidAmount = auction.current_price === 0
    ? auction.starting_price
    : auction.current_price + auction.min_increment;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amount = parseInt(bidAmount);

    if (!bidAmount || amount <= 0) {
      setError('Masukkan jumlah bid yang valid');
      return;
    }

    if (amount < minBidAmount) {
      setError(`Bid minimal ${formatCurrency(minBidAmount)}`);
      return;
    }

    if (balance !== null && amount > balance) {
      setError(`Saldo tidak mencukupi. Saldo Anda: ${formatCurrency(balance)}`);
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
    <div className="bg-white rounded-xl p-5">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Letakkan Penawaran</h3>

      {auction.status !== 'active' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
          ⚠️ Lelang tidak aktif. Status: <strong>{auction.status}</strong>
        </div>
      )}

      {balance !== null && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
          <span className="text-sm text-blue-700">Saldo Anda</span>
          <span className="font-bold text-blue-800">{formatCurrency(balance)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block mb-1.5 font-medium text-gray-800">
            Jumlah Penawaran
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Min: ${formatCurrency(minBidAmount)}`}
              disabled={auction.status !== 'active' || loading}
              className="flex-1 p-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-brand transition-colors disabled:bg-gray-100 disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={auction.status !== 'active' || loading}
              className={`px-6 py-3 text-white rounded-lg font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${auction.status === 'active' ? 'bg-brand hover:bg-[#085f9a]' : 'bg-gray-400'
                }`}
            >
              {loading ? 'Memproses...' : 'Bid'}
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-1.5">
            Penawaran minimal: <strong>{formatCurrency(minBidAmount)}</strong>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default BidForm;
