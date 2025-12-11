import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage, markMessagesAsRead, uploadImage } from '../api/chatApi';
import MessageBubble from './MessageBubble';
import ProductPickerModal from './ProductPickerModal';
import { Upload, Send, ArrowLeft, Package } from 'lucide-react';
import { compressImage, validateImage } from '../../shared/utils/imageCompression';

function ChatRoom({ room, userRole, socket, onBack, productIdToSend, onProductSent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [oldestMessageTime, setOldestMessageTime] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Extract values from room object
  const storeId = room.store_id;
  const buyerId = room.buyer_id;
  const displayName = userRole === 'BUYER' ? room.store_name : room.buyer_name;
  const displayImage = userRole === 'BUYER' ? room.store_logo_path : room.buyer_avatar_path;

  // Fetch current user ID from session API on mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch('/api/session.php', { credentials: 'include' });
        const data = await response.json();
        if (data.ok && data.user_id) {
          setCurrentUserId(parseInt(data.user_id));
        } else {
          console.error('[ChatRoom] Failed to get user_id from session');
        }
      } catch (error) {
        console.error('[ChatRoom] Error fetching user_id:', error);
      }
    };
    
    fetchUserId();
  }, []);

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
      if (data.store_id === storeId && data.buyer_id === buyerId && data.user_id !== currentUserId) {
        setTypingUser(data.is_typing ? displayName : null);
        
        if (data.is_typing) {
          setTimeout(() => setTypingUser(null), 3000);
        }
      }
    };

    const handleMessagesRead = (data) => {
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
      if (error.feature_disabled) {
        const reason = error.message || 'Fitur chat sedang dinonaktifkan';
        window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
        return;
      }
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
      
      // Validate image
      const validation = validateImage(file);
      if (!validation.valid) {
        alert(validation.errors.join('\n'));
        return;
      }
      
      // Compress image
      const compressedFile = await compressImage(file);
      
      // Upload image
      const uploadData = await uploadImage(compressedFile, storeId, buyerId);
      
      // Send message with image
      const data = await sendMessage(storeId, buyerId, 'image', uploadData.image_url);
      
      // Add message to local state immediately
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        
        // Broadcast via WebSocket
        if (socket?.isConnected) {
          socket.broadcastMessage(storeId, buyerId, data.message.message_id);
        }
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (error.feature_disabled) {
        const reason = error.message || 'Fitur chat sedang dinonaktifkan';
        window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
        return;
      }
      console.error('Failed to upload image:', error);
      alert('Gagal mengirim gambar');
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

  const handleSelectProduct = useCallback(async (product) => {
    try {
      setSending(true);
      const data = await sendMessage(
        storeId, 
        buyerId, 
        'item_preview', 
        JSON.stringify({
          product_id: product.product_id,
          product_name: product.product_name,
          product_price: product.product_price,
          product_image: product.product_image
        }),
        product.product_id
      );
      
      // Add message to local state immediately
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        
        // Broadcast via WebSocket
        if (socket?.isConnected) {
          socket.broadcastMessage(storeId, buyerId, data.message.message_id);
        }
      }
    } catch (error) {
      if (error.feature_disabled) {
        const reason = error.message || 'Fitur chat sedang dinonaktifkan';
        window.location.href = `/disabled.php?reason=${encodeURIComponent(reason)}`;
        return;
      }
      console.error('Failed to send product:', error);
      alert('Gagal mengirim produk');
    } finally {
      setSending(false);
    }
  }, [storeId, buyerId, socket]);

  // Auto-send product preview when productIdToSend changes
  useEffect(() => {
    if (!productIdToSend || !storeId || !buyerId) return;

    const sendProductPreview = async () => {
      try {
        console.log('[Auto-send] Fetching product:', productIdToSend);
        
        // Fetch product details
        const response = await fetch(`/api/products/get.php?id=${productIdToSend}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch product');
        
        const productData = await response.json();
        console.log('[Auto-send] Product data:', productData);
        
        if (productData && productData.product_id) {
          const product = {
            product_id: productData.product_id,
            product_name: productData.product_name,
            product_price: productData.price,
            product_image: productData.main_image_path
          };
          
          console.log('[Auto-send] Sending product preview...');
          await handleSelectProduct(product);
          console.log('[Auto-send] Product sent successfully');
          
          // Notify parent that product has been sent
          if (onProductSent) {
            onProductSent();
          }
        }
      } catch (error) {
        console.error('[Auto-send] Failed to send product preview:', error);
      }
    };

    // Delay to ensure chat room is fully loaded
    const timer = setTimeout(() => {
      sendProductPreview();
    }, 1000);

    return () => clearTimeout(timer);
  }, [productIdToSend, storeId, buyerId, handleSelectProduct, onProductSent]);

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

          <button
            onClick={() => setShowProductPicker(true)}
            disabled={sending}
            className="p-2 text-gray-500 hover:text-gray-700 transition flex-shrink-0"
            title="Kirim produk"
          >
            <Package size={18} className="md:w-5 md:h-5" />
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

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelectProduct={handleSelectProduct}
        storeId={storeId}
        userRole={userRole}
      />
    </div>
  );
}

ChatRoom.displayName = 'ChatRoom';

export default ChatRoom;
