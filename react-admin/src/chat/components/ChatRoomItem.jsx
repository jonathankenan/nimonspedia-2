export default function ChatRoomItem({ room, isActive, onClick, userRole }) {
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text || 'Belum ada pesan';
    return text.substring(0, maxLength) + '...';
  };

  const displayName = userRole === 'BUYER' ? room.store_name : room.buyer_name;
  const displayImage = userRole === 'BUYER' ? room.store_logo_path : null;
  const lastMessage = truncateText(room.last_message, 50);
  const timeAgo = formatTimeAgo(room.last_message_at);

  return (
    <div
      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition flex items-center gap-3 ${
        isActive ? 'bg-blue-50 hover:bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {displayImage ? (
          <img
            src={displayImage}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover bg-gray-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg">
            {displayName?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h4 className="font-semibold text-gray-900 truncate text-sm">
            {displayName}
          </h4>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {timeAgo}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 truncate flex-1">
            {lastMessage}
          </p>
          {room.unread_count > 0 && (
            <span className="ml-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
              {room.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
