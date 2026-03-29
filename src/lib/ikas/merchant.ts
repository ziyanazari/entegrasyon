// src/lib/ikas/merchant.ts
import { ikasGraphQLRequest } from './graphqlClient';

let cachedSalesChannelId: string | null = null;
let cachedStockLocationId: string | null = null;

export async function getSalesChannelId(token: string): Promise<string | null> {
  if (cachedSalesChannelId) return cachedSalesChannelId;

  const query = `
    query getSalesChannels {
      listSalesChannel {
        id
        name
      }
    }
  `;
  try {
    const result = await ikasGraphQLRequest(token, query);
    const channels = result?.listSalesChannel || [];
    if (channels.length > 0) {
      cachedSalesChannelId = channels[0].id;
      console.log(`Satış Kanalı bulundu: ${channels[0].name} (${channels[0].id})`);
      return cachedSalesChannelId;
    }
    console.warn('Hiç satış kanalı bulunamadı!');
    return null;
  } catch (error) {
    console.error('getSalesChannelId hatası:', error);
    return null;
  }
}

/**
 * Ikas'taki stok konumunu (depo) getirir.
 * Bu ID, saveProductStockLocations mutation'ında stockLocationId olarak kullanılır.
 */
export async function getStockLocationId(token: string): Promise<string | null> {
  if (cachedStockLocationId) return cachedStockLocationId;

  const query = `
    query getStockLocations {
      listStockLocation {
        id
        name
      }
    }
  `;
  try {
    const result = await ikasGraphQLRequest(token, query);
    const locations = result?.listStockLocation || [];
    if (locations.length > 0) {
      cachedStockLocationId = locations[0].id;
      console.log(`Stok Konumu bulundu: ${locations[0].name} (${locations[0].id})`);
      return cachedStockLocationId;
    }
    console.warn('Hiç stok konumu bulunamadı!');
    return null;
  } catch (error) {
    console.error('getStockLocationId hatası:', error);
    return null;
  }
}

// Eski fonksiyon adı — geriye dönük uyumluluk için
export const getBranchId = getStockLocationId;
