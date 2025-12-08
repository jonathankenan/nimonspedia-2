import { useState, useEffect, useRef } from 'react';
import { getMessages, sendMessage, markMessagesAsRead, uploadImage } from '../api/chatApi';
import MessageBubble from './MessageBubble';
import { Upload, Send, ArrowLeft } from 'lucide-react';

export default function ChatRoom({ room, userRole, socket, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Extract values from room object
  const storeId = room.store_id;
  const buyerId = room.buyer_id;
  const displayName = userRole === 'BUYER' ? room.store_name : room.buyer_name;
  const displayImage = userRole === 'BUYER' ? room.store_logo_path : room.buyer_avatar_path;

  // Get current user ID from session storage
  const getCurrentUserId = () => {
    try {
      const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
      return userId ? parseInt(userId) : null;
    } catch (error) {
      console.error('Failed to get user ID:', error);
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  // Load messages
  useEffect(() => {
    if (storeId && buyerId) {
      loadMessages();
    }
  }, [storeId, buyerId]);

  // Join WebSocket room
  useEffect(() => {
    if (socket?.isConnected && storeId && buyerId) {
      socket.joinRoom(storeId, buyerId);
      
      return () => {
        socket.leaveRoom();
      };
    }
  }, [socket?.isConnected, storeId, buyerId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark as read when opening room
  useEffect(() => {
    if (storeId && buyerId) {
      markAsRead();
    }
  }, [storeId, buyerId]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket?.isConnected) return;

    const handleMessageReceived = (data) => {
      console.log('[ChatRoom] Message received via WebSocket:', data);
      // Backend sends: { store_id, buyer_id, message: {...} }
      if (data.store_id === storeId && data.buyer_id === buyerId) {
        setMessages(prev => [...prev, data.message]);
        
        // Mark as read if sender is not current user
        if (data.message.sender_id !== currentUserId) {
          markAsRead();
        }
      }
    };

    const handleUserTyping = (data) => {
      console.log('[ChatRoom] Typing event:', data);
      if (data.store_id === storeId && data.buyer_id === buyerId && data.user_id !== currentUserId) {
        setTypingUser(data.is_typing ? displayName : null);
        
        if (data.is_typing) {
          setTimeout(() => setTypingUser(null), 3000);
        }
      }
    };

    const handleMessagesRead = (data) => {
      console.log('[ChatRoom] Messages read event:', data);
      if (data.store_id === storeId && data.buyer_id === buyerId) {
        setMessages(prev => 
          prev.map(msg => ({ ...msg, is_read: true }))
        );
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket?.isConnected, storeId, buyerId, currentUserId]);

  const loadMessages = async (before = null) => {
    try {
      setLoading(true);
      const data = await getMessages(storeId, buyerId, 50, before);
      
      if (before) {
        setMessages(prev => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }

      if (data.messages.length > 0) {
        setOldestMessageTime(data.messages[0].created_at);
        setHasMore(data.messages.length === 50);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    try {
      setSending(true);
      const data = await sendMessage(storeId, buyerId, 'text', content);
      
      setNewMessage('');
      
      // Add message to local state immediately
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        
        // Broadcast via WebSocket
        if (socket?.isConnected) {
          socket.broadcastMessage(storeId, buyerId, data.message.message_id);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error.response?.data?.error || 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSending(true);
      
      // Upload image
      const uploadData = await uploadImage(file);
      
      // Send message with image
      const data = await sendMessage(storeId, buyerId, 'image', uploadData.image_url);
      
      // Broadcast via WebSocket
      if (socket) {
        socket.broadcastMessage(storeId, buyerId, data.message.message_id);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to send image');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.sendTyping(storeId, buyerId, true);
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.sendTyping(storeId, buyerId, false);
      }, 3000);
    }
  };

  const markAsRead = async () => {
    try {
      await markMessagesAsRead(storeId, buyerId);
      
      if (socket) {
        socket.markAsRead(storeId, buyerId);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMoreMessages = () => {
    if (oldestMessageTime && !loading) {
      loadMessages(oldestMessageTime);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition"
              title="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover bg-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
              {displayName?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 truncate">{displayName}</h3>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-gray-50"
      >
        {hasMore && (
          <div className="text-center mb-4">
            <button
              onClick={loadMoreMessages}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition"
            >
              {loading ? 'Memuat...' : 'Muat Pesan Lama'}
            </button>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Memuat pesan...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Belum ada pesan</div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.message_id}
                message={message}
                currentUserId={currentUserId}
                senderName={message.sender_id !== currentUserId ? displayName : null}
              />
            ))}
          </>
        )}

        {typingUser && (
          <div className="text-sm text-gray-500 italic py-2">
            {typingUser} sedang mengetik...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2 md:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="p-2 text-gray-500 hover:text-gray-700 transition flex-shrink-0"
            title="Kirim gambar"
          >
            <Upload size={18} className="md:w-5 md:h-5" />
          </button>

          <textarea
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ketik pesan..."
            rows={1}
            className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ maxHeight: '120px' }}
          />

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex-shrink-0"
            title="Kirim"
          >
            <Send size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
