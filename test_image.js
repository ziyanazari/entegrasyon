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
  const deepQuery = `
    query {
      __type(name: "ProductImageInput") {
        inputFields {
          name
          type { name kind ofType { name kind } }
        }
      }
      schema: __schema {
        types {
          name
          kind
        }
      }
    }
  `;
  
  const res = await fetch(gqlUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query: deepQuery }),
  });

  const data = await res.json();
  console.log('ProductImageInput:', JSON.stringify(data.data.__type?.inputFields, null, 2));

  const stockRelatedTypes = data.data.schema.types.filter(t => t.name.includes('Stock') || t.name.includes('Inventory'));
  console.log('Stock Types:', stockRelatedTypes.map(t => t.name).join(', '));
}

test();
