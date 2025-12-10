import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSellerProducts, createAuction } from '../api/auctionApi';

const CreateAuction = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        product_id: '',
        starting_price: '',
        min_increment: '',
        quantity: '',
        start_time: ''
    });

    const [selectedProduct, setSelectedProduct] = useState(null);
    const queryParams = new URLSearchParams(window.location.search);
    const preSelectedProductId = queryParams.get('productId');

    useEffect(() => {
        if (!preSelectedProductId) {
            setError('Produk tidak ditemukan. Silakan pilih produk dari halaman Kelola Produk.');
            setLoading(false);
            return;
        }
        loadProduct();
    }, [preSelectedProductId]);

    const loadProduct = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('adminToken');
            let data;

            if (token) {
                data = await fetchSellerProducts(token, preSelectedProductId);
            } else {
                const response = await fetch(`/seller/api/seller-products.php?id=${preSelectedProductId}`, {
                    credentials: 'include'
                });
                const result = await response.json();
                data = result.data || result;
            }

            // API might return array or single object depending on implementation, 
            // but our PHP returns array even for single item
            const product = Array.isArray(data) ? data[0] : data;

            if (product) {
                setProducts([product]); // Keep it as array for consistency if needed, though we don't map anymore
                setSelectedProduct(product);
                setFormData(prev => ({ ...prev, product_id: product.product_id }));
            } else {
                setError('Produk tidak ditemukan atau bukan milik Anda.');
            }

        } catch (err) {
            console.error('Error loading product:', err);
            setError('Gagal memuat produk');
        } finally {
            setLoading(false);
        }
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

        if (selectedProduct && quantity > selectedProduct.stock) {
            setError(`Kuantitas tidak boleh melebihi stock (${selectedProduct.stock})`);
            return;
        }

        if (!formData.start_time) {
            setError('Waktu mulai wajib diisi');
            return;
        }

        // if (!formData.end_time) {
        //     setError('Waktu selesai wajib diisi');
        //     return;
        // }

        // if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        //     setError('Waktu selesai harus lebih besar dari waktu mulai');
        //     return;
        // }

        try {
            setSubmitting(true);

            const token = localStorage.getItem('adminToken');
            const auctionData = {
                product_id: parseInt(formData.product_id),
                starting_price: startingPrice,
                min_increment: minIncrement,
                quantity: quantity,
                start_time: formData.start_time
            };

            let result;
            result = await createAuction(auctionData, token);

            console.log(result);
            const newAuctionId = result.data?.auction_id || result.auction_id;
            if (newAuctionId) {
                alert('Lelang berhasil dibuat!');
                navigate(`/auction/${newAuctionId}`);
            } else {
                throw new Error('Gagal mendapatkan ID lelang baru');
            }
        } catch (err) {
            setError(err.message || 'Gagal membuat lelang');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                Memuat produk...
            </div>
        );
    }

    return (
        <div className="p-5 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/seller/auctions')}
                    className="px-4 py-2 bg-transparent text-brand border border-brand rounded-md mb-4 hover:bg-sky-50 transition-colors"
                >
                    ← Kembali
                </button>
                <h1 className="text-3xl font-bold text-brand mb-2">
                    Buat Lelang Baru
                </h1>
                <p className="m-0 text-gray-500">
                    Isi formulir untuk membuat lelang produk
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm">
                {/* Product Info (Read-only) */}
                <div className="mb-5">
                    <label className="block mb-2 font-semibold text-gray-800">
                        Produk
                    </label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-4">
                        {selectedProduct ? (
                            <>
                                <img
                                    src={selectedProduct.main_image_path || '/assets/images/default.png'}
                                    alt={selectedProduct.product_name}
                                    className="w-16 h-16 object-cover rounded-md"
                                />
                                <div>
                                    <h3 className="font-bold text-gray-800">{selectedProduct.product_name}</h3>
                                    <div className="text-sm text-gray-600">
                                        Harga Asli: Rp {selectedProduct.price.toLocaleString()} | Stock: {selectedProduct.stock}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500">Memuat info produk...</div>
                        )}
                    </div>
                </div>

                {/* Starting Price */}
                <div className="mb-5">
                    <label className="block mb-2 font-semibold text-gray-800">
                        Harga Mulai (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="starting_price"
                        value={formData.starting_price}
                        onChange={handleChange}
                        required
                        min="1000"
                        step="1000"
                        placeholder="Contoh: 100000"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-brand transition-colors"
                    />
                </div>

                {/* Min Increment */}
                <div className="mb-5">
                    <label className="block mb-2 font-semibold text-gray-800">
                        Increment Minimal (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="min_increment"
                        value={formData.min_increment}
                        onChange={handleChange}
                        required
                        min="1000"
                        step="1000"
                        placeholder="Contoh: 10000"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-brand transition-colors"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                        Jumlah minimum kenaikan setiap bid
                    </div>
                </div>

                {/* Quantity */}
                <div className="mb-5">
                    <label className="block mb-2 font-semibold text-gray-800">
                        Kuantitas <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                        min="1"
                        max={selectedProduct ? selectedProduct.stock : undefined}
                        placeholder="Jumlah item yang dilelang"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-brand transition-colors"
                    />
                    {selectedProduct && (
                        <div className="mt-1 text-sm text-gray-500">
                            Maksimal: {selectedProduct.stock} item
                        </div>
                    )}
                </div>

                {/* Start Time */}
                <div className="mb-6">
                    <label className="block mb-2 font-semibold text-gray-800">
                        Waktu Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-brand transition-colors"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                        Lelang akan dimulai pada waktu yang ditentukan
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 p-3.5 bg-brand text-white rounded-lg font-semibold hover:bg-[#085f9a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Membuat Lelang...' : 'Buat Lelang'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/seller/auctions')}
                        disabled={submitting}
                        className="px-6 py-3.5 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        Batal
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateAuction;
