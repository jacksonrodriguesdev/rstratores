const http = require('http');
http.get('http://localhost:8080/', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => {
    // console.log('Received data length:', chunk.length);
  });
  res.on('end', () => {
    console.log('Response ended.');
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
