async function run() {
  console.log('Fetching /api/public/analytics ...');
  try {
    const res = await fetch('http://localhost:8080/api/public/analytics', {
      headers: { 'Accept': 'application/json' }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response (first 100 chars):', text.substring(0, 100));
  } catch(e) {
    console.error('Fetch error:', e);
  }
}
run();
