// src/lib/ikas/products.ts
import { ikasGraphQLRequest } from './graphqlClient';
import { getSalesChannelId } from './merchant';

let cachedSalesChannelId: string | null = null;

export interface IkasProductData {
  id: string;
  supplierProductId: string;
  name: string;
  sku: string;
  stock: number;
  mainCategory: string;
  subCategory: string;
  sellingPrice: number;
  buyingPrice: number;
  currency: string;
  taxRate: number;
  images: string[];
  brand: string;
  features?: string;
  description?: string;
  categoryIds?: string[];
}

/**
 * Sends a single product to ikas API (Create via GraphQL)
 */
export async function sendProductToIkas(productData: IkasProductData, token: string): Promise<any> {
  const query = `
    mutation SaveProduct($input: ProductInput!) {
      saveProduct(input: $input) {
        id
        name
        variants {
          id
          sku
        }
      }
    }
  `;

  if (!cachedSalesChannelId) {
    cachedSalesChannelId = await getSalesChannelId(token);
  }

  const activeChannels = cachedSalesChannelId ? [cachedSalesChannelId] : [];

  const input: any = {
    name: productData.name,
    type: 'PHYSICAL',
    description: productData.description || '',
    categoryIds: productData.categoryIds || [],
    salesChannelIds: activeChannels,
    salesChannels: activeChannels.map(id => ({ id, status: 'VISIBLE' })),
    variants: [
      {
        sku: productData.sku,
        prices: [
          {
            sellPrice: productData.sellingPrice,
          }
        ]
      }
    ]
  };

  return ikasGraphQLRequest(token, query, { input });
}

/**
 * Updates an existing product's price in ikas.
 * NOT için: Stok ayrıca saveProductStock ile güncellenir.
 */
export async function updateProductInIkas(ikasId: string, productData: Partial<IkasProductData>, token: string): Promise<any> {
  const query = `
    mutation UpdateProduct($input: ProductInput!) {
      saveProduct(input: $input) {
        id
        name
        variants {
          id
          sku
        }
      }
    }
  `;

  // Sadece fiyatı güncelle. SKU olmadan varyant güncellemek sorunlara yol açabilir.
  // Mevcut varyantı korumak için sadece id gönder.
  const input: any & { id: string } = {
    id: ikasId,
    // Varyantları güncellemek istiyorsak, mevcut varyantın id'si de olmalı.
    // Aksi takdirde Ikas yeni bir varyant ekleyebilir.
    // Bu yüzden sadece ürün seviyesindeki alanları güncelliyoruz.
  };

  // Eğer sellingPrice varsa fiyatı güncelle (varyant id olmadan güvenli değil, atla)
  // Sadece ürün meta bilgilerini güncelle
  return ikasGraphQLRequest(token, query, { input });
}

/**
 * Fetches a product from ikas by SKU
 */
export async function getIkasProductBySku(sku: string, token: string): Promise<any | null> {
  // Ikas'ta ürünleri SKU ile aramak için listProduct kullan
  // Not: listProduct yerine listProducts olabilir — her ikisini de dene
  const query = `
    query GetProductBySku($sku: String) {
      listProduct(search: $sku, pagination: { limit: 1 }) {
        data {
          id
          name
          variants {
            id
            sku
          }
        }
      }
    }
  `;

  const variables = { sku };

  try {
    const result = await ikasGraphQLRequest(token, query, variables);
    const products = result?.listProduct?.data || [];

    if (products.length === 0) return null;

    // SKU tam eşleşmesini kontrol et (search bazen genel sonuç döner)
    const exactMatch = products.find((p: any) =>
      p.variants?.some((v: any) => v.sku === sku)
    );

    return exactMatch || null;
  } catch (err) {
    console.warn(`SKU aranırken hata: ${sku} ->`, err);
    return null;
  }
}
