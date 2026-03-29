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

  const gqlUrl = `https://api.myikas.com/api/v1/admin/graphql`;
  const getProductQuery = `
    query {
      listProducts(search: "HH850-KS", pagination: { limit: 1 }) {
        data {
          id
          variants { id }
        }
      }
    }
  `;
  const prodRes = await fetch(gqlUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: getProductQuery })
  });
  const prodData = await prodRes.json();
  const product = prodData.data.listProducts.data[0];
  console.log('Product Found:', product.id, 'Variant:', product.variants[0].id);

  // Test Image URL
  const testUrl = "https://xml.ebijuteri.com/image/bordo-miyuki-tasli-hal-hal.jpg";
  const url = `https://api.myikas.com/api/v1/admin/product/upload/image`;

  console.log('Uploading image...');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productImage: {
        url: testUrl,
        productId: product.id,
        variantIds: [product.variants[0].id],
        isMain: true
      }
    })
  });

  if (!response.ok) {
     console.log('Error:', await response.text());
  } else {
     console.log('Image Uploaded:', await response.json());
  }
}

test();
