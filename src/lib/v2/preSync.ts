import { ikasGraphQLRequest } from '../ikas/graphqlClient';

export interface CategoryCache {
    [categoryName: string]: string; // name -> id
}

let cachedCategories: CategoryCache | null = null;
let cachedBrands: CategoryCache | null = null;

export async function fetchAllCategories(token: string): Promise<CategoryCache> {
    if (cachedCategories) return cachedCategories;
    
    // Simulate fetching all categories from Ikas
    const query = `
        query ListCategory {
            listCategory(pagination: { limit: 500 }) {
                data { id name }
            }
        }
    `;
    
    try {
        const res = await ikasGraphQLRequest(token, query, {});
        const categoryMap: CategoryCache = {};
        res.listCategory?.data?.forEach((c: any) => {
            categoryMap[c.name.trim().toLowerCase()] = c.id;
        });
        cachedCategories = categoryMap;
        return categoryMap;
    } catch (e) {
        console.error("Kategori çekme hatası:", e);
        return {};
    }
}

export async function syncCategory(categoryName: string, token: string): Promise<string | null> {
    if (!categoryName) return null;
    
    const categories = await fetchAllCategories(token);
    const normalizedName = categoryName.trim().toLowerCase();
    
    // 1. Check if category exists
    if (categories[normalizedName]) {
        return categories[normalizedName];
    }
    
    // 2. If not, do NOT create it (Requested to disable global creation)
    console.warn(`Kategori bulunamadı, oluşturma kapalı: ${categoryName}`);
    return null; 
}
