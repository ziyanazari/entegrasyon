const { ikasGraphQLRequest } = require('./src/lib/ikas/graphqlClient');
const { getIkasToken } = require('./src/lib/ikas/auth');

async function checkProductInput() {
  try {
    const token = await getIkasToken();
    const query = `
      {
        __type(name: "ProductInput") {
          name
          inputFields {
            name
          }
        }
      }
    `;
    const res = await ikasGraphQLRequest(token, query);
    const fields = res?.__type?.inputFields?.map(f => f.name) || [];
    console.log('ProductInput Fields:', JSON.stringify(fields, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkProductInput();
