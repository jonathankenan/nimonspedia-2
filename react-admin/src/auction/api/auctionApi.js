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
  try {
    const response = await axios.post(
      `${API_BASE}/${auctionId}/bid`,
      { bidAmount },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Error placing bid:', error);
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
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating auction:', error);
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
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error editing auction:', error);
    throw error.response?.data || error;
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
