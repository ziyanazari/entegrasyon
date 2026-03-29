// src/lib/ikas/categories.ts
import { ikasGraphQLRequest } from './graphqlClient';
export interface IkasCategory {
  id: string; // İkas tarafındaki id (cat_xxxx)
  name: string; // Kategori adı
  parentId?: string; // Varsa üst kategori ID'si
}

/**
 * İkas'taki mevcut tüm kategorileri getirir
 */
export async function getIkasCategories(token: string): Promise<IkasCategory[]> {
  const query = `
    query GetCategories {
      listCategories(pagination: { limit: 100 }) {
        data {
          id
          name
        }
      }
    }
  `;

  try {
    const result = await ikasGraphQLRequest(token, query);
    const categoriesList = result?.listCategories?.data || [];

    return categoriesList.map((cat: any) => ({
      id: cat.id || cat._id,
      name: cat.name || cat.title || 'Bilinmeyen',
      parentId: cat.parentId || null
    }));

  } catch (error) {
    console.error('getIkasCategories error:', error);
    // Hataları ekrana bastığımızda İkas'ın query'yi reddetme sebebini göreceğiz.
    return [];
  }
}

/**
 * İkas'ta yeni bir kategori oluşturur
 */
export async function createIkasCategory(name: string, parentId: string | null = null, token: string): Promise<IkasCategory | null> {
  const query = `
    mutation CreateCategory($input: CategoryInput!) {
      saveCategory(input: $input) {
        id
        name
      }
    }
  `;
  
  const input: any = { name };
  if (parentId) {
    input.parentId = parentId; // Belki alanın adı parentCategoryId'dir, hatadan göreceğiz.
  }

  try {
    const result = await ikasGraphQLRequest(token, query, { input });
    const createdCat = result?.saveCategory;

    if (!createdCat) return null;

    return {
      id: createdCat.id,
      name: createdCat.name,
      parentId: parentId || undefined
    };

  } catch (error) {
    console.error(`Kategori oluşturulamadı (${name}):`, error);
    return null; // Sync işlemine devam edilmesi için null döner
  }
}
