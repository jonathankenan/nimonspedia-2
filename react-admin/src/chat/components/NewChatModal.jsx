import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStores, createChatRoom } from '../api/chatApi';

export default function NewChatModal({ isOpen, onClose, onChatCreated }) {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStores();
    }
  }, [isOpen, search]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const data = await getStores(search);
      setStores(data.stores);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (storeId) => {
    try {
      setCreating(true);
      const data = await createChatRoom(storeId);
      onChatCreated(data.room);
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Gagal membuat chat');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Mulai Chat Baru</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari toko..."
            className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Store List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Memuat...</div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Tidak ada toko ditemukan
            </div>
          ) : (
            <div className="space-y-2">
              {stores.map((store) => (
                <div
                  key={store.store_id}
                  onClick={() => handleCreateChat(store.store_id)}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                >
                  <img
                    src={store.store_logo_path || '/assets/images/default-store.png'}
                    alt={store.store_name}
                    className="w-12 h-12 rounded-full object-cover bg-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {store.store_name}
                    </h4>
                    {store.store_description && (
                      <p className="text-sm text-gray-600 truncate">
                        {store.store_description}
                      </p>
                    )}
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
