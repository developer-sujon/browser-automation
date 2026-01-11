import WebSocket from 'ws';

const username = "brd-customer-hl_1844116d-zone-scraping_browser1";
const password = "l20ywvbvliqp";
const host = "brd.superproxy.io:9222";

const encodedUser = encodeURIComponent(username);
const encodedPass = encodeURIComponent(password);
const url = `wss://${encodedUser}:${encodedPass}@${host}`;

console.log("Connecting to", url.replace(password, "***"));

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('Error:', err);
});

ws.on('unexpected-response', (req, res) => {
  console.error('Unexpected response:', res.statusCode, res.statusMessage);
  res.on('data', (chunk) => {
    console.log('Body:', chunk.toString());
  });
});
