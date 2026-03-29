// src/lib/ikas/merchant.ts
import { ikasGraphQLRequest } from './graphqlClient';

export async function getSalesChannelId(token: string): Promise<string | null> {
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
      return channels[0].id; // İlk bulunan satış kanalını döndür
    }
    return null;
  } catch (error) {
    console.error('getSalesChannelId error:', error);
    return null;
  }
}

export async function getBranchId(token: string): Promise<string | null> {
  const query = `
    query getBranches {
      listStockLocation {
        id
        name
      }
    }
  `;
  try {
    const result = await ikasGraphQLRequest(token, query);
    const branches = result?.listStockLocation || [];
    if (branches.length > 0) {
      return branches[0].id; // İlk depoyu seçiyoruz
    }
    return null;
  } catch (error) {
    console.error('getBranchId error:', error);
    return null;
  }
}
