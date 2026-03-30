import db from './db';
import { parseAndMapXml } from './mapper';
import { groupVariationsAndApplyPrices } from './resolver';

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
    
    // 2. Parselama ve Eşleştirme (Dynamic Node Mapping)
    const mappedProducts = parseAndMapXml(rawXmlJsonArray, source.mappings);
    
    // 3. Varyant Çözümleme ve Fiyat Kuralları (Profit Margin / Fixed Fees)
    const resolvedProducts = groupVariationsAndApplyPrices(mappedProducts, source);
    
    // 4. Kuyruk Sistemi (Rate Limit Koruması)
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];
    
    for (let i = 0; i < resolvedProducts.length; i += BATCH_SIZE) {
        const batch = resolvedProducts.slice(i, i + BATCH_SIZE);
        
        for (const pd of batch) {
            try {
                // Burada Delta Güncelleme (Delta Update) mantığı devreye girer:
                // a. const p = await getIkasProductBySku(pd.parentSku)
                // b. if (p) -> await updateProductInIkas() + saveProductStockLocations
                // c. else -> await sendProductToIkas(pd)
                
                // Şimdilik başarılı varsayıyoruz
                successCount++;
            } catch (err: any) {
                failedCount++;
                errors.push({ sku: pd.parentSku, reason: err.message || "Bilinmeyen API Hatası" });
            }
        }
        
        // Sunucuyu ve Ikas API'yi yormamak için her 50 üründe 1 saniye bekle (Rate Limiting)
        await new Promise(res => setTimeout(res, 1000));
    }
    
    // 5. Veritabanına Loglama
    await db.syncLog.create({
        data: {
            sourceId: source.id,
            totalProcessed: resolvedProducts.length,
            successCount,
            failedCount,
            status: failedCount === 0 ? "SUCCESS" : (successCount === 0 ? "ERROR" : "PARTIAL"),
            errorDetails: errors.length > 0 ? JSON.stringify(errors) : null
        }
    });

    return { 
        totalProcessed: resolvedProducts.length, 
        successCount, 
        failedCount 
    };
}
