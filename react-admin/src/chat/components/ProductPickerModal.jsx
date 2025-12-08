import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export default function ProductPickerModal({ isOpen, onClose, onSelectProduct, storeId, userRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen, storeId, userRole]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      let response;
      if (userRole === 'SELLER') {
        // Fetch seller's own products
        response = await fetch(`/seller/api/seller-products.php`, {
          credentials: 'include'
        });
      } else {
        // Fetch all products from the store buyer is chatting with
        response = await fetch(`/buyer/api/get-store-products.php?store_id=${storeId}`, {
          credentials: 'include'
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error('Failed to load products');
      }
      
      const text = await response.text();
      console.log('Raw API Response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response was:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      // seller-products.php returns { success: true, data: [...] }
      // buyer endpoint returns { products: [...] }
      const productList = data.data || data.products || [];
      console.log('Loaded products:', productList);
      setProducts(productList);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('Gagal memuat produk: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    onSelectProduct({
      product_id: product.product_id,
      product_name: product.product_name,
      product_price: product.price,
      product_image: product.main_image_path || product.image_path
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Pilih Produk</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Memuat produk...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? 'Tidak ada produk yang ditemukan' : 'Belum ada produk'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.product_id}
                  onClick={() => handleSelectProduct(product)}
                  className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                >
                  <img
                    src={product.main_image_path || product.image_path || '/assets/images/default-product.png'}
                    alt={product.product_name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {product.product_name}
                    </h3>
                    <p className="text-green-600 font-semibold">
                      Rp {new Intl.NumberFormat('id-ID').format(product.price)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Stok: {product.stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
