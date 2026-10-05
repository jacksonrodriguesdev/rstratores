fetch('http://localhost:8081/src/routeTree.gen.ts')
  .then(r => r.text())
  .then(t => console.log('Body:', t.substring(0, 1000)))
  .catch(e => console.error('Error:', e.message));
