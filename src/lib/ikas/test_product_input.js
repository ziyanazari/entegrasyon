const { ikasGraphQLRequest } = require('./src/lib/ikas/graphqlClient');
const { getIkasToken } = require('./src/lib/ikas/auth');

async function checkProductInput() {
  const token = await getIkasToken();
  const query = `
    {
      __type(name: "ProductInput") {
        name
        inputFields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  `;
  const res = await ikasGraphQLRequest(token, query);
  const fields = res.__type.inputFields.map(f => f.name);
  console.log('ProductInput Fields:', fields);
}

checkProductInput().catch(console.error);
