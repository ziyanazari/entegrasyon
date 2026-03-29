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
      v1: __type(name: "SaveStockLocationsInput") {
        inputFields {
          name
          type { name kind ofType { name kind } }
        }
      }
      v2: __type(name: "ProductStockLocationInput") {
        inputFields {
          name
          type { name kind ofType { name kind } }
        }
      }
      v3: __type(name: "Query") {
        fields { name }
      }
    }
  `;
  const res = await fetch(gqlUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: deepQuery }),
  });
  const data = await res.json();
  console.log('SaveStockLocationsInput:', JSON.stringify(data.data.v1.inputFields, null, 2));
  console.log('ProductStockLocationInput:', JSON.stringify(data.data.v2.inputFields, null, 2));
  console.log('Queries with Stock/Location:', data.data.v3.fields.map(f=>f.name).filter(n => n.includes('Stock') || n.includes('Location') || n.includes('Branch')));
}

test();
