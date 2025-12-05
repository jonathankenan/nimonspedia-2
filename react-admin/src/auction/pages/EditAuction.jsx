import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuctionDetail, fetchSellerProducts, editAuction } from '../api/auctionApi';

const EditAuction = () => {
    const { auctionId } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        auction_id: '',
        product_id: '',
        starting_price: '',
        min_increment: '',
        quantity: '',
        start_time: ''
    });

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [originalAuction, setOriginalAuction] = useState(null);

    useEffect(() => {
        loadData();
    }, [auctionId]);

    const loadData = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('adminToken');
            let productsData;

            if (token) {
                const [auctionData, pData] = await Promise.all([
                    fetchAuctionDetail(auctionId),
                    fetchSellerProducts(token)
                ]);
                productsData = pData;
                setOriginalAuction(auctionData);
            } else {
                // Use PHP API for both
                const [auctionRes, productsRes] = await Promise.all([
                    fetch(`/api/auction/${auctionId}`),
                    fetch('/seller/api/seller-products.php', { credentials: 'include' })
                ]);
                const auctionData = await auctionRes.json();
                const productsResult = await productsRes.json();
                setOriginalAuction(auctionData.data || auctionData);
                productsData = productsResult.data || productsResult;
            }

            setProducts(Array.isArray(productsData) ? productsData : []);

            // Format start_time for datetime-local input
            let startTimeFormatted = '';
            const auction = originalAuction || {};
            if (auction.start_time) {
                const date = new Date(auction.start_time);
                startTimeFormatted = date.toISOString().slice(0, 16);
            }

            setFormData({
                auction_id: auction.auction_id,
                product_id: auction.product_id,
                starting_price: auction.starting_price,
                min_increment: auction.min_increment,
                quantity: auction.quantity,
                start_time: startTimeFormatted
            });

            const product = productsData.find(p => p.product_id === auction.product_id);
            setSelectedProduct(product || null);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    const handleProductChange = (e) => {
        const productId = e.target.value;
        setFormData({ ...formData, product_id: productId });

        const product = products.find(p => p.product_id === parseInt(productId));
        setSelectedProduct(product || null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.product_id) {
            setError('Pilih produk terlebih dahulu');
            return;
        }

        const startingPrice = parseFloat(formData.starting_price);
        const minIncrement = parseFloat(formData.min_increment);
        const quantity = parseInt(formData.quantity);

        if (startingPrice <= 0) {
            setError('Harga mulai harus lebih dari 0');
            return;
        }

        if (minIncrement <= 0) {
            setError('Increment minimal harus lebih dari 0');
            return;
        }

        if (quantity <= 0) {
            setError('Kuantitas harus lebih dari 0');
            return;
        }

        if (selectedProduct && quantity > selectedProduct.stock + (originalAuction?.quantity || 0)) {
            setError(`Kuantitas tidak boleh melebihi stock tersedia (${selectedProduct.stock + (originalAuction?.quantity || 0)})`);
            return;
        }

        if (!formData.start_time) {
            setError('Waktu mulai wajib diisi');
            return;
        }


        try {
            setSubmitting(true);

            const token = localStorage.getItem('adminToken');
            const auctionData = {
                auction_id: parseInt(formData.auction_id),
                product_id: parseInt(formData.product_id),
                starting_price: startingPrice,
                min_increment: minIncrement,
                quantity: quantity,
                start_time: formData.start_time
            };

            if (token) {
                await editAuction(auctionData, token);
            } else {
                const response = await fetch('/seller/api/edit-auction.php', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(auctionData)
                });
                if (!response.ok) throw new Error('Failed to update auction');
            }

            alert('Lelang berhasil diupdate!');
            navigate('/seller/auctions');
        } catch (err) {
            setError(err.message || 'Gagal mengupdate lelang');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                Memuat data...
            </div>
        );
    }

    if (!originalAuction) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ color: '#991b1b', marginBottom: '16px' }}>Lelang tidak ditemukan</div>
                <button
                    onClick={() => navigate('/seller/auctions')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#0A75BD',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Kembali
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => navigate('/seller/auctions')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        color: '#0A75BD',
                        border: '1px solid #0A75BD',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '16px'
                    }}
                >
                    ← Kembali
                </button>
                <h1 style={{ margin: '0 0 8px 0', color: '#0A75BD', fontSize: '2rem', fontWeight: '700' }}>
                    Edit Lelang
                </h1>
                <p style={{ margin: 0, color: '#6b7280' }}>
                    Update informasi lelang produk
                </p>
            </div>

            {error && (
                <div style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px' }}>
                {/* Product Selection */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                        Produk <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                        name="product_id"
                        value={formData.product_id}
                        onChange={handleProductChange}
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                        }}
                    >
                        <option value="">-- Pilih Produk --</option>
                        {products.map(product => (
                            <option key={product.product_id} value={product.product_id}>
                                {product.product_name} (Stock: {product.stock} | Harga: Rp {product.price.toLocaleString()})
                            </option>
                        ))}
                    </select>
                    {selectedProduct && (
                        <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                <strong>Stock tersedia:</strong> {selectedProduct.stock + (originalAuction?.quantity || 0)} item
                                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                    (Termasuk {originalAuction?.quantity || 0} item dari lelang ini)
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Starting Price */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                        Harga Mulai (Rp) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="number"
                        name="starting_price"
                        value={formData.starting_price}
                        onChange={handleChange}
                        required
                        min="1"
                        step="1000"
                        placeholder="Contoh: 100000"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                {/* Min Increment */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                        Increment Minimal (Rp) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="number"
                        name="min_increment"
                        value={formData.min_increment}
                        onChange={handleChange}
                        required
                        min="1"
                        step="1000"
                        placeholder="Contoh: 10000"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                        }}
                    />
                    <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#6b7280' }}>
                        Jumlah minimum kenaikan setiap bid
                    </div>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                        Kuantitas <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                        min="1"
                        max={selectedProduct ? selectedProduct.stock + (originalAuction?.quantity || 0) : undefined}
                        placeholder="Jumlah item yang dilelang"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                        }}
                    />
                    {selectedProduct && (
                        <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#6b7280' }}>
                            Maksimal: {selectedProduct.stock + (originalAuction?.quantity || 0)} item
                        </div>
                    )}
                </div>

                {/* Start Time */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                        Waktu Mulai <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                        }}
                    />
                    <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#6b7280' }}>
                        Lelang akan dimulai pada waktu yang ditentukan
                    </div>
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            flex: 1,
                            padding: '14px',
                            backgroundColor: '#0A75BD',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1
                        }}
                    >
                        {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/seller/auctions')}
                        disabled={submitting}
                        style={{
                            padding: '14px 24px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1
                        }}
                    >
                        Batal
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditAuction;
