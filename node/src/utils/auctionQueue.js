// utils/auctionQueue.js

const dbPool = require('../config/db');
const { broadcastMessage } = require('./websocket');

const auctionQueue = []; // queue untuk auction scheduled
const activeAuction = {
  auctionId: null,
  countdown: 0,
  timer: null
};

// --- 1. Tambah auction ke queue ---
function enqueueAuction(auctionId) {
  auctionQueue.push({ auctionId });
  tryActivateNext();
}

// --- 2. Cek & aktifkan auction berikutnya jika belum ada active auction ---
async function tryActivateNext() {
  if (activeAuction.auctionId || auctionQueue.length === 0) return;
  const next = auctionQueue.shift();
  await activateAuction(next.auctionId);
}

// --- 3. Aktifkan auction ---
async function activateAuction(auctionId) {
  const conn = await dbPool.getConnection();
  try {
    await conn.query(`UPDATE auctions SET status='active' WHERE auction_id=?`, [auctionId]);
    activeAuction.auctionId = auctionId;
    activeAuction.countdown = 15;

    broadcastMessage({
      type: 'auction_activated',
      auction_id: auctionId,
      countdown: 15
    });
  } finally {
    conn.release();
  }
}

// --- 4. Start / reset countdown ---
function startCountdown(duration = 15) {
  if (!activeAuction.auctionId) return;
  if (activeAuction.timer) clearTimeout(activeAuction.timer);

  activeAuction.countdown = duration;
  activeAuction.timer = setTimeout(async () => {
    await stopActiveAuction();
  }, duration * 1000);
}

// --- 5. Hentikan auction active ---
async function stopActiveAuction() {
  if (!activeAuction.auctionId) return;

  const auctionId = activeAuction.auctionId;
  const conn = await dbPool.getConnection();
  try {
    await conn.query(`UPDATE auctions SET status='ended', end_time=NOW() WHERE auction_id=?`, [auctionId]);
  } finally {
    conn.release();
  }

  broadcastMessage({ type: 'auction_stopped', auction_id: auctionId });

  // reset state
  activeAuction.auctionId = null;
  activeAuction.timer = null;

  // aktifkan auction berikutnya dari queue
  tryActivateNext();
}

module.exports = {
  enqueueAuction,
  startCountdown,
  activeAuction
};
