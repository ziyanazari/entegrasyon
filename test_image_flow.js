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
  
  // Step 1: Create a dummy product
  const createQuery = `
    mutation {
      saveProduct(input: {
        name: "Test Image Product",
        type: PHYSICAL,
        variants: [{
          sku: "TEST-IMG-123",
          prices: [{ sellPrice: 50.0 }]
        }],
        salesChannelIds: []
      }) {
        id
        variants { id }
      }
    }
  `;
  const createRes = await fetch(gqlUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: createQuery })
  });
  const createData = await createRes.json();
  if (!createData.data) {
    console.log("Create Error:", JSON.stringify(createData));
    return;
  }
  const productId = createData.data.saveProduct.id;
  const variantId = createData.data.saveProduct.variants[0].id;
  console.log('Created product:', productId, 'Variant:', variantId);

  // Step 2: Upload Image
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
        productId: productId,
        variantIds: [variantId],
        isMain: true
      }
    })
  });
  
  const uploadJson = await res.json();
  console.log('Upload Result:', JSON.stringify(uploadJson));
  
  const imageId = uploadJson.data?.imageId || uploadJson.imageId;
  
  // Step 3: Link Image via Update
  const updateQuery = `
    mutation {
      saveProduct(input: {
        id: "${productId}",
        variants: [{
          id: "${variantId}",
          sku: "TEST-IMG-123",
          prices: [{ sellPrice: 50.0 }],
          images: [{
            imageId: "${imageId}",
            isMain: true,
            order: 1
          }]
        }]
      }) {
        id
      }
    }
  `;
  const updateRes = await fetch(gqlUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: updateQuery })
  });
  console.log('Update Result:', JSON.stringify(await updateRes.json()));
}

test();
