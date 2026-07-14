import http from 'http';

const data = JSON.stringify({ url: 'https://example.com' });

const options = {
  hostname: '127.0.0.1',
  port: 8100,
  path: '/browser/text',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let response = '';
  res.on('data', (chunk) => response += chunk);
  res.on('end', () => console.log('Final Result:', response));
});

req.on('error', (e) => console.error('Connection failed:', e.message));
req.write(data);
req.end();
