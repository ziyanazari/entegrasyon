// src/lib/sync-service.ts
import fs from 'fs';
import path from 'path';
import { getIkasToken } from './ikas/auth';
import { sendProductToIkas, getIkasProductBySku } from './ikas/products';
import { fetchAndParseXML, mapXmlToIkasProduct } from './xmlParser';
import { getIkasCategories, createIkasCategory } from './ikas/categories';
import { getStockLocationId } from './ikas/merchant';
import { saveProductStock } from './ikas/stock';
import { uploadImageToIkas } from './ikas/images';

export interface SyncResult {
  processedTotal: number;
  success: number;
  failed: number;
  errors: any[];
}

function appendLog(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'sync_logs.txt');
    const time = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    const line = `[${time}] ${message}\n`;
    fs.appendFileSync(logPath, line, 'utf8');
    console.log(message);
  } catch (e) {
    console.error('Log yazma hatası:', e);
  }
}

function extractProductsArray(xmlData: any): any[] {
  const rootKeys = Object.keys(xmlData).filter(k => k !== '?xml' && k !== '');
  if (rootKeys.length === 0) return [];

  const rootObj = xmlData[rootKeys[0]];

  const candidates = [
    rootObj?.Urunler?.Urun,
    rootObj?.Urunler?.urun,
    rootObj?.urunler?.urun,
    rootObj?.Urun,
    rootObj?.urun,
    rootObj?.Products?.Product,
    rootObj?.products?.product,
    rootObj?.items?.item,
    rootObj?.Items?.Item,
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return Array.isArray(candidate) ? candidate : [candidate];
    }
  }

  if (Array.isArray(rootObj)) return rootObj;

  return [];
}

export async function runSync(
  xmlUrl: string, 
  sourceName?: string, 
  limit?: number,
  minPrice: number = 0,
  profitMargin: number = 0
): Promise<SyncResult> {
  const startTime = Date.now();
  const results: SyncResult = { processedTotal: 0, success: 0, failed: 0, errors: [] };

  appendLog('==================================================');
  appendLog(`SYNC BAŞLADI: ${xmlUrl} | Kaynak: ${sourceName || 'Bilinmeyen'} | Min: ${minPrice} | Kar: %${profitMargin}`);

  try {
    // 1. XML Çek & Parse
    appendLog('XML çekiliyor...');
    const xmlData = await fetchAndParseXML(xmlUrl);
    const allProductsArray = extractProductsArray(xmlData);

    if (allProductsArray.length === 0) {
      throw new Error('XML içinde ürün listesi bulunamadı.');
    }
    appendLog(`XML: ${allProductsArray.length} ürün bulundu.`);

    // 2. Filtrele & Kar Marjı Uygula
    const validProducts: { xmlProduct: any; ikasProduct: any }[] = [];
    let filteredOut = 0;

    for (const xmlProduct of allProductsArray) {
      const ikasProduct = mapXmlToIkasProduct(xmlProduct);
      
      // Bareme göre filtrele (Maliyet üzerinden değil, satış fiyatı üzerinden kontrol edelim)
      if (ikasProduct.sellingPrice < minPrice) {
        filteredOut++;
        continue;
      }

      // Kar Marjı Uygula (Satış fiyatına ekle)
      if (profitMargin > 0) {
        ikasProduct.sellingPrice = Math.round(ikasProduct.sellingPrice * (1 + profitMargin / 100));
      }

      validProducts.push({ xmlProduct, ikasProduct });
    }

    const productsToProcess = limit ? validProducts.slice(0, limit) : validProducts;
    results.processedTotal = productsToProcess.length;
    appendLog(`Filtreleme sonrası: ${productsToProcess.length} ürün işlenecek (${filteredOut} adet barem filtresiyle çıkarıldı).`);

    // 3. Ikas Token & Stok Konumu
    appendLog('Ikas kimlik doğrulaması yapılıyor...');
    const token = await getIkasToken();
    const stockLocationId = await getStockLocationId(token);
    
    if (!stockLocationId) {
      appendLog('UYARI: Stok konumu bulunamadı — stok güncellemeleri çalışmayacak!');
    }

    // 4. Kategori Hazırlığı
    const uniqueCategories = new Set<string>();
    for (const { ikasProduct } of productsToProcess) {
      if (ikasProduct.mainCategory) uniqueCategories.add(ikasProduct.mainCategory);
      if (ikasProduct.subCategory)  uniqueCategories.add(ikasProduct.subCategory);
    }

    const ikasCategories = await getIkasCategories(token);
    const ikasCategoryMap = new Map<string, string>();
    for (const cat of ikasCategories) {
      ikasCategoryMap.set(cat.name, cat.id);
    }

    for (const catName of Array.from(uniqueCategories)) {
      if (!catName || ikasCategoryMap.has(catName)) continue;
      // Kategori oluşturmayı tamamen kapattık (Kullanıcı uyarısı: Kategoriler manuel eklendi)
      appendLog(`UYARI: Kategori Ikas'ta bulunamadı, atlanıyor: ${catName}`);
    }

    // 5. Ürün Döngüsü
    for (const { xmlProduct, ikasProduct } of productsToProcess) {
      const sku = ikasProduct.sku || String(xmlProduct.stok_kodu || xmlProduct.code || xmlProduct.StockCode || '');

      if (!sku) {
        results.failed++;
        continue;
      }

      try {
        // Kategori bağlama
        const categoryIds: string[] = [];
        if (ikasProduct.mainCategory && ikasCategoryMap.get(ikasProduct.mainCategory)) {
          categoryIds.push(ikasCategoryMap.get(ikasProduct.mainCategory)!);
        }
        if (ikasProduct.subCategory && ikasCategoryMap.get(ikasProduct.subCategory)) {
          categoryIds.push(ikasCategoryMap.get(ikasProduct.subCategory)!);
        }
        ikasProduct.categoryIds = categoryIds;
        
        // Kaynak bilgisini shortDescription'a ekle
        if (sourceName) {
            ikasProduct.shortDescription = `[XML_Source: ${sourceName}]`;
        }

        const existingProduct = await getIkasProductBySku(sku, token);
        let productId: string | null = null;
        let variantId: string | null = null;
        let isNewProduct = false;

        if (existingProduct) {
          productId = existingProduct.id;
          variantId = existingProduct.variants?.[0]?.id || null;
          
          // Mevcut ürünü de GÜNCELLE (Fiyat değişikliği vb. için)
          ikasProduct.id = productId;
          await sendProductToIkas(ikasProduct, token);
        } else {
          const createdResponse = await sendProductToIkas(ikasProduct, token);
          const createdData = createdResponse?.saveProduct;
          if (!createdData?.id) throw new Error('Ürün oluşturma yanıtı boş.');
          productId = createdData.id;
          variantId = createdData.variants?.[0]?.id || null;
          isNewProduct = true;
        }

        // Stok
        if (stockLocationId && productId && variantId) {
          try {
            await saveProductStock(token, stockLocationId, productId, variantId, ikasProduct.stock);
          } catch (e) {}
        }

        // Resimler (Sadece yeni ürünse veya resimler eksikse eklenebilir, şimdilik her seferinde kontrol)
        /*
        // Resimler (GÖRSEL YÜKLEME KAPATILDI)
        if (isNewProduct && productId && variantId && ikasProduct.images.length > 0) {
          let isMain = true;
          let order = 1;
          for (const imgUrl of ikasProduct.images) {
            if (!imgUrl) continue;
            await uploadImageToIkas(token, imgUrl, productId, variantId, isMain, order);
            isMain = false;
            order++;
            await new Promise(r => setTimeout(r, 600));
          }
        }
        */

        results.success++;
        appendLog(`SKU: ${sku} | ✅ ${isNewProduct ? 'Yeni' : 'Güncellendi'}`);
      } catch (err: any) {
        results.failed++;
        results.errors.push({ sku, error: err.message });
        appendLog(`SKU: ${sku} | ❌ HATA: ${err.message}`);
      }
      
      await new Promise(r => setTimeout(r, 300));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    appendLog(`SYNC BİTTİ. Başarılı: ${results.success} | Hata: ${results.failed} | Süre: ${elapsed}s`);
    appendLog('==================================================');

    return results;
  } catch (error: any) {
    appendLog(`SYNC KRİTİK HATA: ${error.message}`);
    throw error;
  }
}

/**
 * Lightweight function to just get the product count from XML
 */
export async function getXmlProductCount(xmlUrl: string): Promise<number> {
  try {
    const xmlData = await fetchAndParseXML(xmlUrl);
    const allProductsArray = extractProductsArray(xmlData);
    return allProductsArray.length;
  } catch (err) {
    console.error('XML Count Hatası:', err);
    return 0;
  }
}
