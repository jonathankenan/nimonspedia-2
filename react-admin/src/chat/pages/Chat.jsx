import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { getChatRooms } from '../api/chatApi';
import useChatSocket from '../../shared/hooks/useChatSocket';
import ChatRoomItem from '../components/ChatRoomItem';
import ChatRoom from '../components/ChatRoom';
import NewChatModal from '../components/NewChatModal';

export default function Chat() {
  const navigate = useNavigate?.() || null; // Optional navigate for standalone mode
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const socket = useChatSocket();

  // Check feature flag and user role
  useEffect(() => {
    checkFeatureFlag();
    loadUserRole();
  }, []);

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
      console.log('[Chat] User role from localStorage:', role);
      setUserRole(role);
    } catch (error) {
      console.error('Failed to load user role:', error);
    }
  };

  // Load chat rooms
  useEffect(() => {
    loadChatRooms();
  }, []);

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

  console.log('[Chat] Current userRole:', userRole);

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
