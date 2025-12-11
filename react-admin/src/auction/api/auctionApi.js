import axios from 'axios';

const API_BASE = '/api/auction';

/**
 * Get all active auctions
 */
export const fetchAuctions = async (limit = 20, offset = 0) => {
  try {
    const response = await axios.get(`${API_BASE}/list`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching auctions:', error);
    if (error.response?.status === 403 && error.response?.data?.error) {
      throw { 
        feature_disabled: true, 
        message: error.response.data.error,
        response: error.response 
      };
    }
    throw error;
  }
};

/**
 * Get single auction detail
 */
export const fetchAuctionDetail = async (auctionId) => {
  try {
    const response = await axios.get(`${API_BASE}/${auctionId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching auction detail:', error);
    if (error.response?.status === 403 && error.response?.data?.error) {
      throw { 
        feature_disabled: true, 
        message: error.response.data.error,
        response: error.response 
      };
    }
    throw error;
  }
};

/**
 * Get bid history for an auction
 */
export const fetchBidHistory = async (auctionId, limit = 50) => {
  try {
    const response = await axios.get(`${API_BASE}/${auctionId}/bids`, {
      params: { limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching bid history:', error);
    throw error;
  }
};

/**
 * Place a bid (requires authentication)
 */
export const placeBid = async (auctionId, bidAmount, token) => {
  const res = await fetch('/api/auction/place-bid.php', {
    method: 'POST',
    credentials: 'include', // penting agar session cookie ikut
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // optional kalau pakai token
    },
    body: JSON.stringify({ auction_id: auctionId, bid_amount: bidAmount })
  });

  const data = await res.json();
  
  if (data.feature_disabled) {
    throw { feature_disabled: true, message: data.message };
  }
  
  if (!res.ok) {
    throw data;
  }

  return data;
};

/**
 * Get user balance (requires authentication)
 */
export const fetchUserBalance = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE}/user/balance`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data.data.balance;
  } catch (error) {
    console.error('Error fetching user balance:', error);
    throw error;
  }
};

/**
 * Get user's active bids (requires authentication)
 */
export const fetchUserActiveBids = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE}/user/active-bids`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user active bids:', error);
    throw error;
  }
};

/**
 * Get seller's auctions (PHP Seller API)
 */
export const fetchSellerAuctions = async (token) => {
  try {
    const response = await axios.get(
      '/seller/api/my-auctions.php',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = response.data.data || response.data;
    if (data.feature_disabled) {
      throw { feature_disabled: true, message: data.message };
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching seller auctions:', error);
    if (error.response?.data?.feature_disabled) {
      throw { feature_disabled: true, message: error.response.data.message };
    }
    throw error.response?.data || error;
  }
};

/**
 * Get seller's products (PHP Seller API)
 */
export const fetchSellerProducts = async (token, id = null) => {
  try {
    const response = await axios.get(
      '/seller/api/seller-products.php',
      {
        params: id ? { id } : {},
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching seller products:', error);
    throw error.response?.data || error;
  }
};

/**
 * Create auction (PHP Seller API)
 */
export const createAuction = async (auctionData, token) => {
  try {
    const response = await axios.post(
      '/seller/api/create-auction.php',
      auctionData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = response.data.data || response.data;
    if (data.feature_disabled) {
      throw { feature_disabled: true, message: data.message };
    }
    
    return data;
  } catch (error) {
    console.error('Error creating auction:', error);
    if (error.response?.data?.feature_disabled) {
      throw { feature_disabled: true, message: error.response.data.message };
    }
    throw error.response?.data || error;
  }
};

/**
 * Edit auction (PHP Seller API)
 */
export const editAuction = async (auctionData, token) => {
  try {
    const response = await axios.put(
      '/seller/api/edit-auction.php',
      auctionData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = response.data.data || response.data;
    if (data.feature_disabled) {
      throw { feature_disabled: true, message: data.message };
    }
    
    return data;
  } catch (error) {
    console.error('Error editing auction:', error);
    if (error.response?.data?.feature_disabled) {
      throw { feature_disabled: true, message: error.response.data.message };
    }
    throw error.response?.data || error;
  }
};

/**
 * Get seller's active auction ID
 */
export const fetchSellerActiveAuction = async (token) => {
  try {
    const response = await axios.get(
      '/seller/api/get-active-auction.php',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data.data.auction_id;
  } catch (error) {
    console.error('Error fetching seller active auction:', error);
    return null;
  }
};

/**
 * Delete auction (PHP Seller API)
 */
export const deleteAuction = async (auctionId, token) => {
  try {
    const response = await axios.delete(
      '/seller/api/delete-auction.php',
      {
        data: { auction_id: auctionId },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error deleting auction:', error);
    throw error.response?.data || error;
  }
};

/**
 * Stop auction (Node.js API)
 */
export const stopAuction = async (auctionId, token) => {
  const res = await fetch('/api/auction/stop-auction.php', {
    method: 'POST',
    credentials: 'include', // penting agar session cookie ikut
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // optional kalau pakai token
    },
    body: JSON.stringify({ auction_id: auctionId})
  });

  const data = await res.json();
  
  if (data.feature_disabled) {
    throw { feature_disabled: true, message: data.message };
  }
  
  if (!res.ok) {
    throw data;
  }

  return data;
};

export const cancelAuction = async (auctionId, token) => {
  const res = await fetch('/api/auction/cancel-auction.php', {
    method: 'POST',
    credentials: 'include', // penting agar session cookie ikut
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // optional kalau pakai token
    },
    body: JSON.stringify({ auction_id: auctionId})
  });

  const data = await res.json();
  
  if (data.feature_disabled) {
    throw { feature_disabled: true, message: data.message };
  }
  
  if (!res.ok) {
    throw data;
  }

  return data;
};
