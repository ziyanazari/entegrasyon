// src/lib/ikas/graphqlClient.ts

interface GraphQLResponse {
  data?: any;
  errors?: any[];
}

export async function ikasGraphQLRequest(token: string, query: string, variables: any = {}): Promise<any> {
  const storeName = process.env.IKAS_STORE_NAME || 'denizavm';
  // İkas'ın global API uç noktası api.myikas.com üzerinden GraphQL denemesi (Eğer LOGIN_REQUIRED store subdomaine has bir hata ise)
  const url = `https://api.myikas.com/api/v1/admin/graphql`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ikas HTTP Error ${response.status}: ${errorText}`);
  }

  const result: GraphQLResponse = await response.json();

  if (result.errors && result.errors.length > 0) {
    // GraphQL errors often have an informative message and path
    const errorMessages = result.errors.map((err: any) => err.message).join(' | ');
    // İlk query/mutation ismini al
    const operationName = query.match(/(query|mutation)\s+(\w+)/)?.[2] || 'Unknown';
    throw new Error(`[${operationName}] Ikas GraphQL Error: ${errorMessages}`);
  }

  return result.data;
}
