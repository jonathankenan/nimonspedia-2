const express = require('express');
const bodyParser = require('body-parser');
const { broadcastMessage } = require('./utils/websocket');

const app = express();
app.use(bodyParser.json());

app.post('/notify_bid', (req, res) => {
  const data = req.body;
  console.log("Received notify:", data);

  if (!data || !data.type) return res.status(400).send({ ok: false });

  switch(data.type) {
    case 'auction_bid_update':
      broadcastMessage({
        type: 'auction_bid_update',
        auction_id: data.auction_id,
        current_price: data.current_price,
        bidder_name: data.bidder_name,
        timestamp: new Date().toISOString()
      });
      break;
    case 'auction_stopped':
      broadcastMessage({
        type: 'auction_stopped',
        auction_id: data.auction_id,
        order_id: data.order_id,
        timestamp: new Date().toISOString()
      });
      break;
    case 'auction_cancelled':
      broadcastMessage({
        type: 'auction_cancelled',
        auction_id: data.auction_id,
        timestamp: new Date().toISOString()
      });
      break;
    default:
      return res.status(400).send({ ok: false, message: 'Unknown type' });
  }

  res.send({ ok: true });
});

const PORT = 3003; // bisa di docker-compose expose
app.listen(PORT, () => {
  console.log(`✅ Node auction notify endpoint running on port ${PORT}`);
});
