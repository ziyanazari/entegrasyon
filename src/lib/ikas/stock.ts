// src/lib/ikas/stock.ts
import { ikasGraphQLRequest } from './graphqlClient';

/**
 * Ikas'ta bir ürün varyantının stok miktarını günceller.
 * 
 * GERÇEK ŞEMA (introspection ile doğrulandı):
 * 
 * mutation SaveProductStock($input: SaveStockLocationsInput!) {
 *   saveProductStockLocations(input: $input)
 * }
 * 
 * SaveStockLocationsInput {
 *   productStockLocationInputs: [ProductStockLocationInput!]!
 * }
 * 
 * ProductStockLocationInput {  ← productId BURADA, üst seviyede değil!
 *   productId:       String!
 *   variantId:       String!
 *   stockLocationId: String!
 *   stockCount:      Float!
 * }
 */
export async function saveProductStock(
  token: string,
  stockLocationId: string,
  productId: string,
  variantId: string,
  stockQuantity: number
): Promise<void> {
  const query = `
    mutation SaveProductStock($input: SaveStockLocationsInput!) {
      saveProductStockLocations(input: $input)
    }
  `;

  // productId, variantId, stockLocationId, stockCount hepsi productStockLocationInputs içinde!
  const input = {
    productStockLocationInputs: [
      {
        productId,
        variantId,
        stockLocationId,
        stockCount: stockQuantity,
      }
    ]
  };

  await ikasGraphQLRequest(token, query, { input });
}
