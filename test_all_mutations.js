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
      __type(name: "Mutation") {
        fields {
          name
        }
      }
      stockInput: __type(name: "SaveStockLocationsInput") {
        inputFields {
          name
          type { name kind ofType { name kind ofType { name kind } } }
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
  const mutations = gqlData.data.__type.fields.map(f => f.name);
  fs.writeFileSync('mutations.json', JSON.stringify({
    mutations,
    SaveStockLocationsInput: gqlData.data.stockInput.inputFields
  }, null, 2));

  console.log('Done mapping mutations.');
}

test();
