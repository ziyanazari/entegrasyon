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

  // Get Branch
  const gqlUrl = `https://api.myikas.com/api/v1/admin/graphql`;
  const getBranchQuery = `query { listBranch { data { id name } } }`;
  const branchRes = await fetch(gqlUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: getBranchQuery })
  });
  const branchData = await branchRes.json();
  console.log('Branch Response:', JSON.stringify(branchData, null, 2));

  // Get test product
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
  console.log('Product Found:', product.id, product.variants[0].id);

  // Test Stock Update
  if (branchData.data && branchData.data.listBranch && branchData.data.listBranch.data[0]) {
    const branchId = branchData.data.listBranch.data[0].id;
    const stockQuery = `
      mutation SaveProductStock($input: SaveStockLocationsInput!) {
        saveProductStockLocations(input: $input) {
          id
        }
      }
    `;
    const stockInput = {
      productStockLocationInputs: [
        {
          branchId: branchId,
          productId: product.id,
          productVariantId: product.variants[0].id,
          stock: 6
        }
      ]
    };
    const stockRes = await fetch(gqlUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: stockQuery, variables: { input: stockInput } })
    });
    console.log('Stock Update Response:', JSON.stringify(await stockRes.json(), null, 2));
  }

  // Test Image Update
  const url = `https://api.myikas.com/api/v1/admin/product/upload/image`;
  console.log('Uploading image...');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productImage: {
        url: "https://xml.ebijuteri.com/image/bordo-miyuki-tasli-hal-hal.jpg",
        productId: product.id,
        variantIds: [product.variants[0].id],
        isMain: true
      }
    })
  });
  console.log('Image Upload Status:', res.status, await res.text());
}

test();
