// src/lib/ikas/stock.ts
import { ikasGraphQLRequest } from './graphqlClient';

export async function saveProductStock(
  token: string, 
  branchId: string, 
  productId: string, 
  variantId: string, 
  stockQuantity: number
) {
  const query = `
    mutation SaveProductStock($input: SaveStockLocationsInput!) {
      saveProductStockLocations(input: $input)
    }
  `;

  // Schema'nın beklediği varsayılan taslağa göre
  const input = {
    productStockLocationInputs: [
      {
        branchId,
        productId,
        productVariantId: variantId,
        stock: stockQuantity
      }
    ]
  };

  try {
    const response = await ikasGraphQLRequest(token, query, { input });
    return response;
  } catch (error) {
    console.error(`[Save Stock] Error updating stock for product ${productId}:`, error);
    throw error;
  }
}
