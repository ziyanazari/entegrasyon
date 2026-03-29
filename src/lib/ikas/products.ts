// src/lib/ikas/products.ts
import { ikasGraphQLRequest } from './graphqlClient';
import { getSalesChannelId } from './merchant';

let cachedSalesChannelId: string | null = null;
export interface IkasProductData {
  id: string; // Database Hash ID
  supplierProductId: string; // Tedarikçi ID
  name: string; // adi
  sku: string; // stok_kodu
  stock: number; // miktar
  mainCategory: string; // AnaKategori
  subCategory: string; // kategori
  sellingPrice: number; // son_kullanici
  buyingPrice: number; // bayi_fiyati
  currency: string; // para_birimi
  taxRate: number; // kdv
  images: string[]; // resim1, resim2 vb.
  brand: string; // marka
  features?: string; // filtreler
  description?: string; // aciklama
  categoryIds?: string[]; // Eşleşen/oluşturulan İkas kategori ID'leri
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
        }
      }
    }
  `;

  if (!cachedSalesChannelId) {
    cachedSalesChannelId = await getSalesChannelId(token);
  }

  const activeChannels = cachedSalesChannelId ? [cachedSalesChannelId] : [];

  // Resimler artık ürün oluşturulduktan sonra route.ts üzerinden yüklenecek (REST API kısıtlaması).

  // İkas GraphQL Hatalarından Çıkarılan Doğru Şema (Adım 3: Satış Kanalları eklendi):
  const input: any = {
    name: productData.name,
    type: 'PHYSICAL', 
    description: productData.description || '',
    categoryIds: productData.categoryIds || [],
    salesChannelIds: activeChannels,
    salesChannels: activeChannels.map(id => ({ id, status: 'VISIBLE' })), // status: VISIBLE (Enum valid values: HIDDEN, PASSIVE, VISIBLE)
    variants: [
      {
        sku: productData.sku,
        prices: [
          {
            sellPrice: productData.sellingPrice,
            // buyPrice: vb. (denemeye devam)
          }
        ]
      }
    ]
  };

  return ikasGraphQLRequest(token, query, { input });
}

/**
 * Updates an existing product in ikas by its database ID
 */
export async function updateProductInIkas(ikasId: string, productData: Partial<IkasProductData>, token: string): Promise<any> {
  const query = `
    mutation UpdateProduct($input: ProductInput!) {
      saveProduct(input: $input) {
        id
        name
      }
    }
  `;

  // Güncellemede fiyat ve stok bilgisi de varyant içerisindedir.
  // Varyantları güncellemek için SKU veya ID gerekebilir. Mevcut bilgi üzerinden kurguluyoruz:
    const input = {
      id: ikasId,
      variants: [
        {
          sku: productData.sku,
          prices: [
            { sellPrice: productData.sellingPrice }
          ]
        }
      ]
    };

    return ikasGraphQLRequest(token, query, { input });
}

/**
 * Fetches a product from ikas by SKU (via GraphQL)
 */
export async function getIkasProductBySku(sku: string, token: string): Promise<any | null> {
  const query = `
    query GetProducts($search: String) {
      listProduct(search: $search, pagination: { limit: 1 }) {
        data {
          id
          name
          sellerSku
          variants {
            id
          }
        }
      }
    }
  `;

  const variables = { search: sku };
  
  try {
    const result = await ikasGraphQLRequest(token, query, variables);
    const products = result?.listProduct?.data || [];
    if (products.length > 0) {
      return products[0];
    }
    return null;
  } catch (err) {
    // 404 gibi bir durum yerine sadece bullanamadığını belirtelim
    console.warn(`SKU aranırken uyarı: ${sku} ->`, err);
    return null;
  }
}

