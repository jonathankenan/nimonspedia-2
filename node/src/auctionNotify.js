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
    case 'auction_created':
      broadcastMessage({
        type: 'auction_created',
        auction_id,
        product_id,
        product_name: productInfo.product_name,
        store_name: productInfo.store_name,
        starting_price,
        current_price: starting_price,
        min_increment,
        quantity,
        start_time,
        status: status  
      });
      break;
    case 'auction_updated':
      broadcastMessage({
        type: 'auction_updated',
        auction_id: data.auction_id,
        ...(data.starting_price !== undefined && { starting_price: data.starting_price }),
        ...(data.min_increment !== undefined && { min_increment: data.min_increment })
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
