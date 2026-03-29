const fs = require('fs');

async function test() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/"/g, '');
    }
  });

  const clientId = env.IKAS_CLIENT_ID;
  const clientSecret = env.IKAS_CLIENT_SECRET;
  const storeName = env.IKAS_STORE_NAME || 'denizavm';

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

  const authData = await authRes.json();
  const token = authData.access_token;

  // Test Image URL
  const testUrl = "https://xml.ebijuteri.com/image/bordo-miyuki-tasli-hal-hal.jpg";

  console.log('Token ready, uploading image...');
  const url = `https://api.myikas.com/api/v1/admin/product/upload/image`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productImage: {
          url: testUrl,
          variantIds: ["test_id"]
        }
      })
    });

    if (!response.ok) {
        console.log('Error Status:', response.status);
        console.log('Error Text:', await response.text());
        return;
    }

    const data = await response.json();
    console.log('Success:', JSON.stringify(data, null, 2));

  } catch(e) {
    console.error('Request failed', e);
  }
}

test();
