import LazyImage from '../../shared/components/LazyImage';
import { getChatImageUrl } from '../../shared/utils/imageUrl';

export default function MessageBubble({ message, currentUserId, senderName }) {
  // Ensure both are numbers for comparison
  const isSent = Number(message.sender_id) === Number(currentUserId);
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getMessageStatus = (isRead) => {
    return isRead ? '✓✓' : '✓';
  };

  let content = null;

  if (message.message_type === 'text') {
    content = (
      <div className="text-sm whitespace-pre-wrap break-words">
        {message.content}
      </div>
    );
  } else if (message.message_type === 'image') {
    const imageUrl = getChatImageUrl(message.content);
    content = (
      <div className="inline-block">
        <LazyImage
          src={imageUrl}
          alt="Chat image"
          className="max-w-[200px] sm:max-w-[250px] md:max-w-[300px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition object-contain bg-gray-100"
          onClick={() => window.open(imageUrl, '_blank')}
          showLoader={true}
        />
      </div>
    );
  } else if (message.message_type === 'item_preview' && message.product_id) {
    const productImageUrl = message.product_image 
      ? getChatImageUrl(message.product_image) 
      : '/assets/images/default-product.png';
    content = (
      <div
        className={`border-2 rounded-lg p-3 bg-white cursor-pointer hover:shadow-md transition flex gap-3 ${
          isSent ? 'border-blue-300' : 'border-gray-300'
        }`}
        onClick={() => {
          const role = localStorage.getItem('userRole');
          if (role === 'BUYER') {
            window.location.href = `/buyer/product.php?id=${message.product_id}`;
          } else {
            window.location.href = `/seller/edit_produk.php?id=${message.product_id}`;
          }
        }}
      >
        <LazyImage
          src={productImageUrl}
          alt={message.product_name}
          className="w-16 h-16 object-cover rounded flex-shrink-0"
          showLoader={false}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">
            {message.product_name}
          </div>
          <div className="text-green-600 font-semibold text-sm">
            Rp {formatNumber(message.product_price)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-3 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[60%]`}>
        {/* Sender name for received messages */}
        {!isSent && senderName && (
          <div className="text-xs text-gray-600 mb-1 ml-1 font-medium">
            {senderName}
          </div>
        )}
        
        {/* Different styling for item_preview */}
        {message.message_type === 'item_preview' ? (
          <>
            {content}
            <div
              className={`text-xs mt-1 flex items-center gap-1 ${
                isSent ? 'text-gray-600 justify-end' : 'text-gray-500'
              }`}
            >
              <span>{formatTime(message.created_at)}</span>
              {isSent && (
                <span className="ml-1">{getMessageStatus(message.is_read)}</span>
              )}
            </div>
          </>
        ) : (
          <div
            className={`rounded-2xl px-3 md:px-4 py-2 ${
              isSent
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-gray-200 text-gray-900 rounded-bl-sm'
            }`}
          >
            {content}
            <div
              className={`text-xs mt-1 flex items-center gap-1 ${
                isSent ? 'text-blue-100 justify-end' : 'text-gray-500'
              }`}
            >
              <span>{formatTime(message.created_at)}</span>
              {isSent && (
                <span className="ml-1">{getMessageStatus(message.is_read)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
