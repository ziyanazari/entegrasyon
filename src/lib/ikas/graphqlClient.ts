// src/lib/ikas/graphqlClient.ts

interface GraphQLResponse {
  data?: any;
  errors?: any[];
}

export async function ikasGraphQLRequest(token: string, query: string, variables: any = {}): Promise<any> {
  const url = `https://api.myikas.com/api/v1/admin/graphql`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  // Rate limit — bekle ve tekrar dene
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '3', 10);
    console.warn(`[GraphQL] 429 Rate Limit. Bekleniyor: ${retryAfter}s`);
    await new Promise(r => setTimeout(r, retryAfter * 1000 + 200));
    return ikasGraphQLRequest(token, query, variables);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ikas HTTP Error ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const rawText = await response.text();
    throw new Error(`Ikas Non-JSON Response (Status ${response.status}): ${rawText.substring(0, 500)}`);
  }

  let result: GraphQLResponse;
  try {
    result = await response.json();
  } catch (err: any) {
    const rawText = await response.text().catch(() => 'No text');
    throw new Error(`JSON Parse Error: ${err.message}. Raw: ${rawText.substring(0, 500)}`);
  }

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map((err: any) => err.message).join(' | ');
    const operationName = query.match(/(query|mutation)\s+(\w+)/)?.[2] || 'Unknown';
    throw new Error(`[${operationName}] Ikas GraphQL Error: ${errorMessages}`);
  }

  return result.data;
}
