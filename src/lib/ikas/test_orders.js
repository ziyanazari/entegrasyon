const { ikasGraphQLRequest } = require('./graphqlClient');
const { getIkasToken } = require('./auth');

async function testOrderSchema() {
  try {
    const token = await getIkasToken();
    
    // Check Order fields
    const query = `
      {
        __type(name: "Order") {
          name
          fields {
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
    console.log('Order Fields:', JSON.stringify(res, null, 2));

    // Also check listOrders query
    const query2 = `
      {
        __schema {
          queryType {
            fields {
              name
              args {
                name
              }
            }
          }
        }
      }
    `;
    const res2 = await ikasGraphQLRequest(token, query2);
    const orderQueries = res2.__schema.queryType.fields.filter(f => f.name.toLowerCase().includes('order'));
    console.log('Order Queries:', JSON.stringify(orderQueries, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testOrderSchema();
