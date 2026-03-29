// test_token.js
const https = require('https');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const fetch = (await import('node-fetch')).default || globalThis.fetch;
  
  const clientId = process.env.IKAS_CLIENT_ID;
  const clientSecret = process.env.IKAS_CLIENT_SECRET;
  const storeName = process.env.IKAS_STORE_NAME || 'denizavm';

  console.log(`[1] Fetching token for ${storeName}...`);

  const authUrl = `https://${storeName}.myikas.com/api/admin/oauth/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const authRes = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!authRes.ok) {
    console.error('Auth failed: ' + await authRes.text());
    return;
  }

  const authData = await authRes.json();
  const token = authData.access_token;
  console.log(`[2] Token received: ${token.substring(0, 15)}...`);

  console.log(`[3] Pinging GraphQL...`);
  const gqlUrl = `https://${storeName}.myikas.com/api/admin/graphql`;
  const gqlQuery = `query { getMerchant { storeName } }`;
  
  const gqlRes = await fetch(gqlUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query: gqlQuery }),
  });

  const gqlData = await gqlRes.json();
  console.log('[4] GraphQL Response:', JSON.stringify(gqlData));
}

test();
