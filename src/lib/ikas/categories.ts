// src/lib/ikas/categories.ts
import { ikasGraphQLRequest } from './graphqlClient';
export interface IkasCategory {
  id: string; // İkas tarafındaki id (cat_xxxx)
  name: string; // Kategori adı
  parentId?: string; // Varsa üst kategori ID'si
}

/**
 * İkas'taki mevcut tüm kategorileri (sayfalı olarak) getirir
 */
export async function getIkasCategories(token: string): Promise<IkasCategory[]> {
  let allCategories: IkasCategory[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  const query = `
    query GetCategories($pagination: PaginationInput) {
      listCategories(pagination: $pagination) {
        data {
          id
          name
          parentId
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  while (hasNextPage) {
    const variables = {
      pagination: {
        limit: 100,
        after: cursor
      }
    };

    try {
      const result = await ikasGraphQLRequest(token, query, variables);
      const data = result?.listCategories;
      if (!data) break;

      const categoriesList = data.data || [];
      allCategories = allCategories.concat(categoriesList.map((cat: any) => ({
        id: cat.id || cat._id,
        name: cat.name || cat.title || 'Bilinmeyen',
        parentId: cat.parentId || null
      })));

      hasNextPage = data.pageInfo?.hasNextPage || false;
      cursor = data.pageInfo?.endCursor || null;

    } catch (error) {
      console.error('getIkasCategories error:', error);
      break; 
    }
  }

  return allCategories;
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
    input.parentId = parentId; 
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
    // Duplicate key error fırlatılmalı ki syncFlow'da yakalayabilelim
    throw error;
  }
}
