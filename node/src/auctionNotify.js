const express = require('express');
const bodyParser = require('body-parser');
const { broadcastMessage } = require('./utils/websocket');

const app = express();
app.use(bodyParser.json());

app.post('/notify_bid', (req, res) => {
  const data = req.body;
  if (!data || !data.auction_id) return res.status(400).send({ ok: false });

  broadcastMessage({
    type: 'auction_bid_update',
    auction_id: data.auction_id,
    current_price: data.current_price,
    bidder_name: data.bidder_name,
    timestamp: new Date().toISOString()
  });

  res.send({ ok: true });
});

const PORT = 3003; // bisa di docker-compose expose
app.listen(PORT, () => {
  console.log(`✅ Node auction notify endpoint running on port ${PORT}`);
});
