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
  description?: string;
  shortDescription?: string;
  categoryIds?: string[];
  tagIds?: string[];
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
    shortDescription: productData.shortDescription || '',
    categoryIds: productData.categoryIds || [],
    tagIds: productData.tagIds || [],
    salesChannelIds: activeChannels,
    salesChannels: activeChannels.map(id => ({ id, status: 'VISIBLE' })),
    variants: [
      {
        id: productData.id ? undefined : undefined, // Variant ID logic can be more complex, but for now we update main product
        sku: productData.sku,
        prices: [
          {
            sellPrice: productData.sellingPrice,
          }
        ]
      }
    ]
  };

  if (productData.id) {
    input.id = productData.id;
  }

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

  const input: any & { id: string } = {
    id: ikasId,
    shortDescription: productData.shortDescription || '',
  };

  return ikasGraphQLRequest(token, query, { input });
}

/**
 * Fetches a product from ikas by SKU
 */
export async function getIkasProductBySku(sku: string, token: string): Promise<any | null> {
  const query = `
    query GetProductBySku($sku: String) {
      listProduct(search: $sku, pagination: { limit: 1 }) {
        data {
          id
          name
          shortDescription
          images {
            id
          }
          mainImage {
            id
          }
          variants {
            id
            sku
            prices {
              sellPrice
            }
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

    const exactMatch = products.find((p: any) =>
      p.variants?.some((v: any) => v.sku === sku)
    );

    return exactMatch || null;
  } catch (err) {
    console.warn(`SKU aranırken hata: ${sku} ->`, err);
    return null;
  }
}
