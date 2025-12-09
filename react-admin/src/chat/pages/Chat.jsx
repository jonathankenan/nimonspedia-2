import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { getChatRooms, createChatRoom } from '../api/chatApi';
import useChatSocket from '../../shared/hooks/useChatSocket';
import ChatRoomItem from '../components/ChatRoomItem';
import ChatRoom from '../components/ChatRoom';
import NewChatModal from '../components/NewChatModal';

function Chat() {
  const navigate = useNavigate?.() || null; // Optional navigate for standalone mode
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [autoOpenData, setAutoOpenData] = useState(null);
  const [productIdToSend, setProductIdToSend] = useState(null);

  const socket = useChatSocket();

  // Check feature flag and user role
  useEffect(() => {
    checkFeatureFlag();
    loadUserRole();
  }, []);

  // (kenan) Listen for feature disable event
  useEffect(() => {
    if (!socket?.isConnected) return;
    socket.on('feature_disabled', (data) => window.location.href = data.redirect_url);
    return () => socket.off('feature_disabled');
  }, [socket.isConnected]);
  //udah

  const checkFeatureFlag = async () => {
    try {
      const response = await fetch('/api/features/check?feature=chat_enabled', {
        credentials: 'include'
      });
      const data = await response.json();
      if (!data.enabled && navigate) {
        navigate('/feature-disabled');
      }
    } catch (error) {
      console.error('Failed to check feature flag:', error);
    }
  };

  const loadUserRole = () => {
    try {
      // Get role from localStorage (set by ProtectedRoute in App.jsx)
      const role = localStorage.getItem('userRole');
      setUserRole(role);
    } catch (error) {
      console.error('Failed to load user role:', error);
    }
  };

  // Load chat rooms
  useEffect(() => {
    loadChatRooms();
  }, []);

  // Check for auto-open chat from sessionStorage and handle it
  useEffect(() => {
    const autoOpenStr = sessionStorage.getItem('autoOpenChat');
    if (autoOpenStr) {
      try {
        const data = JSON.parse(autoOpenStr);
        setAutoOpenData(data);
        sessionStorage.removeItem('autoOpenChat'); // Clean up
      } catch (error) {
        console.error('Failed to parse autoOpenChat:', error);
      }
    }
  }, []);

  // Handle auto-open chat after rooms are loaded
  useEffect(() => {
    // Wait for all required data to be ready
    if (!autoOpenData || loading || !userRole) return;

    const handleAutoOpen = async () => {
      let { storeId, productId } = autoOpenData;
      
      // Parse storeId and productId to ensure they're numbers
      storeId = parseInt(storeId);
      productId = parseInt(productId);
      
      console.log('[Auto-open] Starting with:', { storeId, productId, userRole });
      
      if (userRole !== 'BUYER') {
        console.error('[Auto-open] Only available for buyers. Current role:', userRole);
        setAutoOpenData(null);
        return;
      }

      try {
        // Get userId from session API
        const sessionResponse = await fetch('/api/session.php', { credentials: 'include' });
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.ok || !sessionData.user_id) {
          console.error('[Auto-open] Failed to get user session');
          setAutoOpenData(null);
          return;
        }
        
        const userId = parseInt(sessionData.user_id);
        console.log('[Auto-open] Got userId from session:', userId);
        
        // Check if room already exists
        let existingRoom = rooms.find(r => r.store_id == storeId && r.buyer_id == userId);
        
        console.log('[Auto-open] Existing room:', existingRoom);
        
        if (!existingRoom) {
          // Create new chat room
          console.log('[Auto-open] Creating new room...');
          const result = await createChatRoom(storeId);
          if (result.room) {
            existingRoom = result.room;
            setRooms((prev) => [existingRoom, ...prev]);
            console.log('[Auto-open] Room created:', existingRoom);
          }
        }

        if (existingRoom) {
          const roomKey = `${existingRoom.store_id}_${existingRoom.buyer_id}`;
          console.log('[Auto-open] Opening room:', roomKey);
          setActiveRoomId(roomKey);
          
          // Set product ID to send after room is active
          console.log('[Auto-open] Setting product to send:', productId);
          setProductIdToSend(productId);
        }
      } catch (error) {
        console.error('[Auto-open] Failed:', error);
      } finally {
        setAutoOpenData(null);
      }
    };

    handleAutoOpen();
  }, [autoOpenData, loading, rooms, userRole]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const data = await getChatRooms();
      setRooms(data.rooms || []);
      
      // Auto-select first room if available
      if (data.rooms && data.rooms.length > 0 && !activeRoomId) {
        const firstRoom = data.rooms[0];
        const roomKey = `${firstRoom.store_id}_${firstRoom.buyer_id}`;
        setActiveRoomId(roomKey);
      }
    } catch (error) {
      // (kenan)Handle feature flag redirect
      if (error.response?.data?.redirect_url) window.location.href = error.response.data.redirect_url;
      if (error.redirect_url) window.location.href = error.redirect_url;
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for new messages to update room list
  useEffect(() => {
    if (!socket.isConnected) return;

    const handleNewMessage = (data) => {
      setRooms((prevRooms) => {
        const roomKey = `${data.store_id}_${data.buyer_id}`;
        const roomIndex = prevRooms.findIndex(r => `${r.store_id}_${r.buyer_id}` === roomKey);
        if (roomIndex === -1) {
          // New room, reload list
          loadChatRooms();
          return prevRooms;
        }

        // Update existing room
        const updatedRooms = [...prevRooms];
        const room = updatedRooms[roomIndex];
        room.last_message = data.content;
        room.last_message_at = new Date().toISOString();
        
        // Increment unread if not active room
        if (activeRoomId !== roomKey) {
          room.unread_count = (room.unread_count || 0) + 1;
        }

        // Move to top
        updatedRooms.splice(roomIndex, 1);
        updatedRooms.unshift(room);

        return updatedRooms;
      });
    };

    socket.on('message_received', handleNewMessage);

    return () => {
      socket.off('message_received', handleNewMessage);
    };
  }, [socket.isConnected, activeRoomId]);

  // Listen for read receipts
  useEffect(() => {
    if (!socket.isConnected) return;

    const handleMessagesRead = (data) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const roomKey = `${room.store_id}_${room.buyer_id}`;
          const dataKey = `${data.store_id}_${data.buyer_id}`;
          return roomKey === dataKey
            ? { ...room, unread_count: 0 }
            : room;
        })
      );
    };

    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket.isConnected]);

  // Filter rooms by search
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;

    const query = searchQuery.toLowerCase();
    return rooms.filter((room) => {
      const displayName = userRole === 'BUYER' ? room.store_name : room.buyer_name;
      return displayName?.toLowerCase().includes(query);
    });
  }, [rooms, searchQuery, userRole]);

  const activeRoom = rooms.find(r => `${r.store_id}_${r.buyer_id}` === activeRoomId);

  const handleNewChatCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    const roomKey = `${newRoom.store_id}_${newRoom.buyer_id}`;
    setActiveRoomId(roomKey);
  };

  return (
    <div className="rounded-lg shadow-lg overflow-hidden flex h-[calc(100vh-64px)] bg-gray-50 ">
      {/* Sidebar - Chat Room List */}
      <div className={`${
        activeRoomId ? 'hidden md:flex' : 'flex'
      } w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">Chat</h2>
            {(userRole === 'BUYER' || userRole !== 'SELLER') && (
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                title="Chat Baru"
              >
                <Plus size={20} />
                <span className="text-sm font-medium hidden sm:inline">Chat Baru</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari chat..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat Room List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Memuat...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada chat'}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const roomKey = `${room.store_id}_${room.buyer_id}`;
              return (
                <ChatRoomItem
                  key={roomKey}
                  room={room}
                  isActive={activeRoomId === roomKey}
                  userRole={userRole}
                  onClick={() => setActiveRoomId(roomKey)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Main - Chat Room Interface */}
      <div className={`${
        activeRoomId ? 'flex' : 'hidden md:flex'
      } flex-1 flex-col`}>
        {activeRoom ? (
          <ChatRoom
            room={activeRoom}
            userRole={userRole}
            socket={socket}
            onBack={() => setActiveRoomId(null)}
            productIdToSend={productIdToSend}
            onProductSent={() => setProductIdToSend(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Pilih chat untuk memulai percakapan</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={handleNewChatCreated}
      />
    </div>
  );
}

Chat.displayName = 'Chat';

export default Chat;
