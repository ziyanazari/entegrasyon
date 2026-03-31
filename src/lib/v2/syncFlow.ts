import db from './db';
import { parseAndMapXml } from './mapper';
import { groupVariationsAndApplyPrices } from './resolver';
import { getIkasProductBySku, sendProductToIkas } from '@/lib/ikas/products';
import { getStockLocationId } from '@/lib/ikas/merchant';
import { saveProductStock } from '@/lib/ikas/stock';
import { uploadImageToIkas } from '@/lib/ikas/images';
import { getIkasCategories, createIkasCategory } from '@/lib/ikas/categories';
import { fetchAndParseXML } from '@/lib/xmlParser';
import { getIkasToken } from '@/lib/ikas/auth';

/**
 * Ana kuyruk ve akış yöneticisi.
 * Hem XML parse işlemini yürütür, hem rate-limit'e takılmamak için 50'li partiler halinde işlem yapar,
 * hem de logları veritabanına yazar.
 */
export async function syncProductsFlow(sourceId: string, rawXmlJsonArray: any[], token: string) {
    // 1. Veritabanından XML Kurallarını Çek
    const source = await db.xmlSource.findUnique({
        where: { id: sourceId },
        include: { mappings: true }
    });

    if (!source) throw new Error("Kayıtlı XML Kaynağı bulunamadı");

    // 2. Parselama ve Eşleştirme (Dynamic Node Mapping + priceField)
    const mappedProducts = parseAndMapXml(rawXmlJsonArray, source.mappings, source.priceField || 'bayi_fiyati');

    // 3. Varyant Çözümleme ve Fiyat Kuralları (Profit Margin / Fixed Fees)
    const resolvedProducts = groupVariationsAndApplyPrices(mappedProducts, source);

    // 4. Stok konumu al
    const stockLocationId = await getStockLocationId(token).catch(() => null);

    // 5. Kategori Çözümleyici (Hiyerarşik Yapı)
    const ikasCategories = await getIkasCategories(token);
    const ikasCategoryMap = new Map<string, string>(); // Path -> ID
    
    // Mevcut kategorileri haritala (İsim bazlı basit eşleme için)
    const nameToIdMap = new Map<string, string>();
    for (const cat of ikasCategories) nameToIdMap.set(cat.name, cat.id);

    async function resolveCategoryPath(path: string[]): Promise<string | null> {
        if (!path || path.length === 0) return null;
        
        const pathKey = path.join(' > ');
        if (ikasCategoryMap.has(pathKey)) return ikasCategoryMap.get(pathKey)!;

        let parentId: string | null = null;
        let currentPath: string[] = [];

        for (const part of path) {
            currentPath.push(part);
            const currentKey = currentPath.join(' > ');
            
            if (ikasCategoryMap.has(currentKey)) {
                parentId = ikasCategoryMap.get(currentKey)!;
                continue;
            }

            // İkas'ta bu isimde bir kategori var mı kontrol et (basit eşleme)
            // Not: Tam hiyerarşi kontrolü için parentId kontrolü de eklenebilir ama şimdilik isim yeterli olabilir.
            let existingId = ikasCategories.find(c => c.name === part && (!parentId || c.parentId === parentId))?.id;
            
            if (!existingId) {
                try {
                    console.log(`[V2 Sync] Kategori oluşturuluyor: ${part} (Parent: ${parentId || 'Root'})`);
                    const newCat = await createIkasCategory(part, parentId, token);
                    existingId = newCat?.id;
                } catch (catErr: any) {
                    if (catErr.message.includes('Duplicate key error')) {
                        // Zaten var, listeyi tazelemeden direkt bulmaya çalış (veya sessizce geç, bir sonraki adımda zaten map'e eklenecek)
                        console.warn(`[V2 Sync] Kategori zaten mevcut (Duplicate): ${part}`);
                        // İkas'tan tekrar çekmek yerine mevcut listeden veya map'ten bulmaya çalış
                        existingId = ikasCategories.find(c => c.name === part && (!parentId || c.parentId === parentId))?.id;
                        
                        // Eğer hala bulunamadıysa (çünkü ilk 100'de yoktu), map'e ekleyemeyiz ama ürünü bağlarken tekrar denenecek.
                        // Şimdilik null dönerse resolveCategoryPath durur.
                    } else {
                        throw catErr;
                    }
                }
            }

            if (existingId) {
                ikasCategoryMap.set(currentKey, existingId);
                parentId = existingId;
            } else {
                return null; // Bir aşamada başarısız olursa dur
            }
        }
        return parentId; // En son (yaprak) kategori ID'sini dön
    }

    // Önceden kategorileri hazırla (Opsiyonel: Hızlandırmak için)
    const allCategoryPaths = Array.from(new Set(resolvedProducts.map(p => (p.categories || []).join('|'))))
        .filter(Boolean)
        .map(s => s.split('|'));
    
    for (const path of allCategoryPaths) {
        await resolveCategoryPath(path);
    }

    // 6. Kuyruk Sistemi (Rate Limit Koruması)
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failedCount = 0;
    let isAborted = false;
    const errors: any[] = [];

    for (let i = 0; i < resolvedProducts.length; i += BATCH_SIZE) {
        // --- DURDURMA KONTROLU ---
        const currentSource = await db.xmlSource.findUnique({ where: { id: sourceId }, select: { isSyncing: true } });
        if (!currentSource?.isSyncing) {
            console.log(`[V2 Sync] Islem kullanici tarafindan durduruldu: ${sourceId}`);
            isAborted = true;
            break;
        }

        const batch = resolvedProducts.slice(i, i + BATCH_SIZE);

        for (const pd of batch) {
            const sku = pd.parentSku || pd.sku || '';
            if (!sku) { failedCount++; continue; }

            try {
                // Kategori bağlama (En alt kategoriyi bağla)
                const leafId = await resolveCategoryPath(pd.categories || []);
                pd.categoryIds = leafId ? [leafId] : [];

                // Kaynak adını ekle
                pd.shortDescription = `[XML_Source: ${source.name}]`;

                const existingProduct = await getIkasProductBySku(sku, token);
                let productId: string | null = null;
                let variantId: string | null = null;
                let isNewProduct = false;

                if (existingProduct) {
                    productId = existingProduct.id;
                    variantId = existingProduct.variants?.[0]?.id || null;
                    pd.id = productId;
                    await sendProductToIkas(pd, token);
                } else {
                    const createdResponse = await sendProductToIkas(pd, token);
                    const createdData = createdResponse?.saveProduct;
                    if (!createdData?.id) throw new Error('Ürün oluşturma yanıtı boş.');
                    productId = createdData.id;
                    variantId = createdData.variants?.[0]?.id || null;
                    isNewProduct = true;
                }

                // Stok
                if (stockLocationId && productId && variantId) {
                    await saveProductStock(token, stockLocationId, productId, variantId, pd.stock || 0).catch(() => { });
                }

                // Resimler (sadece yeni ürün)
                if (isNewProduct && productId && variantId && pd.images?.length > 0) {
                    let isMain = true;
                    let order = 1;
                    for (const imgUrl of pd.images) {
                        if (!imgUrl) continue;
                        await uploadImageToIkas(token, imgUrl, productId, variantId, isMain, order);
                        isMain = false;
                        order++;
                        await new Promise(r => setTimeout(r, 600));
                    }
                }

                successCount++;
                await new Promise(r => setTimeout(r, 300));
            } catch (err: any) {
                failedCount++;
                errors.push({ sku, reason: err.message || "Bilinmeyen API Hatası" });
            }
        }

        // Her 50 üründe 1 saniye bekle (Rate Limiting)
        if (i + BATCH_SIZE < resolvedProducts.length) {
            await new Promise(res => setTimeout(res, 1000));
        }
    }

    // 7. Veritabanına Loglama
    await db.syncLog.create({
        data: {
            sourceId: source.id,
            totalProcessed: resolvedProducts.length,
            successCount,
            failedCount,
            status: isAborted ? "ABORTED" : (failedCount === 0 ? "SUCCESS" : (successCount === 0 ? "ERROR" : "PARTIAL")),
            errorDetails: errors.length > 0 ? JSON.stringify(errors) : (isAborted ? "Kullanici tarafindan durduruldu" : null)
        }
    });

    return {
        totalProcessed: resolvedProducts.length,
        successCount,
        failedCount,
        aborted: isAborted
    };
}

/**
 * Belirli bir kaynak ID'si için tüm senkronizasyon sürecini (Fetch -> Parse -> Sync) yönetir.
 * Hem API hem de Cron Job tarafından kullanılır.
 */
export async function runV2Sync(sourceId: string) {
    try {
        // 1. Kaynağı veritabanından çek ve kilitle
        const source = await db.xmlSource.findUnique({ where: { id: sourceId }, include: { mappings: true } });
        if (!source) throw new Error('Kaynak bulunamadı');

        if (source.isSyncing) {
            console.log(`[V2 Sync] ${source.name} zaten senkronize ediliyor. Atlanıyor.`);
            return { skipped: true };
        }

        await db.xmlSource.update({ where: { id: sourceId }, data: { isSyncing: true } });

        // 2. XML çek ve parse et
        console.log(`[V2 Sync] XML Çekiliyor: ${source.url}`);
        const xmlData = await fetchAndParseXML(source.url);

        // 3. Ürün dizisini bul (Tüm dizileri tara ve en uzun olanı seç)
        let allArrays: any[][] = [];
        const findAllArrays = (obj: any) => {
            if (Array.isArray(obj)) {
                allArrays.push(obj);
                obj.forEach(item => findAllArrays(item));
            } else if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(val => findAllArrays(val));
            }
        };
        findAllArrays(xmlData);

        const rawItems = allArrays.sort((a, b) => b.length - a.length)[0] || [];
        if (rawItems.length === 0) throw new Error('XML içinde ürün listesi bulunamadı.');

        // 4. Ikas token al
        const token = await getIkasToken();

        // 5. Senkronizasyonu başlat
        console.log(`[V2 Sync] ${rawItems.length} ürün işleniyor...`);
        const result = await syncProductsFlow(sourceId, rawItems, token);
        return result;

    } finally {
        // Kilidi her durumda aç
        await db.xmlSource.update({ where: { id: sourceId }, data: { isSyncing: false } }).catch(() => {});
    }
}
