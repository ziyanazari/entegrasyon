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
  const gqlQuery = `
    query {
      __schema {
        mutationType {
          fields {
            name
          }
        }
      }
    }
  `;
  
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
  const mutations = gqlData.data.__schema.mutationType.fields.map(f => f.name);
  console.log('Stock/Inventory Mutations:', mutations.filter(m => m.toLowerCase().includes('stock') || m.toLowerCase().includes('inventory')));
  console.log('Image/Media Mutations:', mutations.filter(m => m.toLowerCase().includes('image') || m.toLowerCase().includes('media') || m.toLowerCase().includes('file')));
}

test();
