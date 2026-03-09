/* eslint-disable no-console */

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function run() {
  const cases = [
    `${baseUrl}/api/experiments`,
    `${baseUrl}/api/experiments?keyword=test&dataset=all&page=1&pageSize=10&includeMeta=1`,
    `${baseUrl}/api/experiments?dataset=none&page=1&pageSize=5&includeMeta=1`,
  ];

  for (const url of cases) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${url}`);
    }

    const data = await res.json();
    const size = Array.isArray(data) ? data.length : Array.isArray(data.items) ? data.items.length : 0;
    console.log(`OK ${url} -> items: ${size}`);
  }

  console.log('check:experiments-api passed');
}

run().catch((err) => {
  console.error('check:experiments-api failed:', err.message);
  process.exit(1);
});
