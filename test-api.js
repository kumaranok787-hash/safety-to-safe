const fetch = require('node-fetch');

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/gemini/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'hospitals', lat: 37.78193, lng: -122.40476 })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', data);
  } catch (err) {
    console.error(err);
  }
}

test();
