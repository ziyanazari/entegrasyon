import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getIkasToken } from '@/lib/ikas/auth';
import { sendProductToIkas, updateProductInIkas, getIkasProductBySku } from '@/lib/ikas/products';
import { fetchAndParseXML, mapXmlToIkasProduct } from '@/lib/xmlParser';
import { getIkasCategories, createIkasCategory } from '@/lib/ikas/categories';
import { getBranchId } from '@/lib/ikas/merchant';
import { saveProductStock } from '@/lib/ikas/stock';
import { uploadImageToIkas } from '@/lib/ikas/images';

function appendLog(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'sync_logs.txt');
    const time = new Date().toISOString();
    fs.appendFileSync(logPath, `[${time}] ${message}\n`, 'utf8');
  } catch (e) {
    console.error('Log write error:', e);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { xmlUrl } = body;

    appendLog('--------------------------------------------------');
    appendLog(`SYNC BAŞLADI: ${xmlUrl} - Limit: ${body.limit || 'Tümü'}`);

    if (!xmlUrl || typeof xmlUrl !== 'string') {
      appendLog('Valid XML URL is required');
      return NextResponse.json({ error: 'Valid XML URL is required' }, { status: 400 });
    }

    // 1. Fetch and Parse XML
    const xmlData = await fetchAndParseXML(xmlUrl);
    
    // Attempt to locate the products array in the parsed XML. 
    // This is a naive heuristic and expects commonly structured Turkish e-commerce XML feeds.
    const rootKeys = Object.keys(xmlData).filter(k => k !== '?xml');
    const rootKey = rootKeys[0];
    let productsArray = [];
    
    if (rootKey) {
      const rootObj = xmlData[rootKey];
      
      if (rootObj?.Urunler?.Urun) {
        productsArray = Array.isArray(rootObj.Urunler.Urun) ? rootObj.Urunler.Urun : [rootObj.Urunler.Urun];
      } else if (rootObj?.Urunler?.urun) {
        productsArray = Array.isArray(rootObj.Urunler.urun) ? rootObj.Urunler.urun : [rootObj.Urunler.urun];
      } else if (rootObj?.Urun) {
        // Handle when root tag is <Urunler> and it contains <Urun>
        productsArray = Array.isArray(rootObj.Urun) ? rootObj.Urun : [rootObj.Urun];
      } else if (rootObj?.urun) {
        productsArray = Array.isArray(rootObj.urun) ? rootObj.urun : [rootObj.urun];
      } else if (rootObj?.Products?.Product) {
        productsArray = Array.isArray(rootObj.Products.Product) ? rootObj.Products.Product : [rootObj.Products.Product];
      } else if (rootObj?.items?.item) {
        productsArray = Array.isArray(rootObj.items.item) ? rootObj.items.item : [rootObj.items.item];
      } else if (Array.isArray(rootObj)) {
        productsArray = rootObj;
      }
    }
    
    if (productsArray.length === 0) {
      console.warn("Could not find standard array in XML. Sample data:", JSON.stringify(xmlData).substring(0, 200));
      return NextResponse.json({ error: 'Could not find a recognizable list of products in the XML. You might need to adjust the parser.' }, { status: 400 });
    }

    // Tüm ürünleri çekmek için limiti opsiyonel yapıyoruz
    // Eğer istekte limit belirtilmişse sınırlarız, yoksa XML içerisindeki tüm ürünleri işleriz
    const limit = body.limit ? parseInt(body.limit, 10) : undefined;
    const productsToProcess = limit ? productsArray.slice(0, limit) : productsArray;

    // 2. Authenticate with ikas
    const token = await getIkasToken();
    const branchId = await getBranchId(token);
    if (branchId) {
      console.log("Stok güncellemeleri için Ana Şube ID bulundu:", branchId);
    } else {
      console.warn("DİKKAT: Ana Şube bulunamadı, stok güncellenemeyecek!");
    }

    // -- BAŞLANGIÇ: KATEGORİ SENKRONİZASYON ALGORİTMASI --
    console.log("Kategori taraması başlatılıyor...");
    const uniqueCategories = new Set<string>();
    const validProducts = [];

    // Önce ürünleri filtreleyip geçerli olanları ve onların kategorilerini bulalım
    for (const xmlProduct of productsToProcess) {
        const ikasProduct = mapXmlToIkasProduct(xmlProduct);
        if (ikasProduct.buyingPrice <= 35) continue;
        
        validProducts.push({ xmlProduct, ikasProduct });

        if (ikasProduct.mainCategory) uniqueCategories.add(ikasProduct.mainCategory);
        if (ikasProduct.subCategory) uniqueCategories.add(ikasProduct.subCategory);
    }

    // İkas'tan mevcut kategorileri çekelim
    const ikasCategories = await getIkasCategories(token);
    const ikasCategoryMap = new Map<string, string>(); // isim -> ID haritası
    
    for (const cat of ikasCategories) {
        ikasCategoryMap.set(cat.name, cat.id);
    }

    // Eksik kategorileri bulup oluşturalım
    for (const catName of Array.from(uniqueCategories)) {
        if (!catName) continue;
        if (!ikasCategoryMap.has(catName)) {
            console.log(`İkas'ta bulunamayan kategori oluşturuluyor: ${catName}`);
            const newCat = await createIkasCategory(catName, null, token);
            if (newCat && newCat.id) {
                ikasCategoryMap.set(catName, newCat.id);
            }
        }
    }
    console.log("Kategori taraması tamamlandı.");
    // -- BİTİŞ: KATEGORİ SENKRONİZASYON ALGORİTMASI --

    // 3. Map and Sync
    const syncResults = {
      processedTotal: validProducts.length,
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Sequential sync to avoid rate limiting
    for (const { xmlProduct, ikasProduct } of validProducts) {
      try {
        // Kategori ID'lerini ürüne bağlayalım
        const categoryIds: string[] = [];
        if (ikasProduct.mainCategory && ikasCategoryMap.has(ikasProduct.mainCategory)) {
            categoryIds.push(ikasCategoryMap.get(ikasProduct.mainCategory)!);
        }
        if (ikasProduct.subCategory && ikasCategoryMap.has(ikasProduct.subCategory)) {
            categoryIds.push(ikasCategoryMap.get(ikasProduct.subCategory)!);
        }
        ikasProduct.categoryIds = categoryIds;

        const sku = ikasProduct.sku || xmlProduct.code || xmlProduct.StockCode;

        if (!sku) {
           throw new Error('Ürün için geçerli bir Stok Kodu / SKU bulunamadı.');
        }

        // Check if exists
        const existingProduct = await getIkasProductBySku(sku, token);

        let productId: string | null = null;
        let variantId: string | null = null;
        let isNewProduct = false;

        if (existingProduct && (existingProduct.id || existingProduct._id)) {
            // Update only price (stock is handled via location mutation)
            const ikasId = existingProduct.id || existingProduct._id;
            await updateProductInIkas(ikasId, {
                sellingPrice: ikasProduct.sellingPrice,
                buyingPrice: ikasProduct.buyingPrice
            }, token);
            
            productId = ikasId;
            variantId = existingProduct.variants?.[0]?.id || null;
        } else {
            // Create new
            const createdResponse = await sendProductToIkas(ikasProduct, token);
            const createdData = createdResponse?.saveProduct;
            
            if (createdData) {
               productId = createdData.id;
               variantId = createdData.variants?.[0]?.id || null;
               isNewProduct = true;
            }
        }

        // Stok güncellenmesi
        if (branchId && productId && variantId && ikasProduct.stock !== undefined) {
             try {
                await saveProductStock(token, branchId, productId, variantId, ikasProduct.stock);
                appendLog(`SKU: ${sku} | Stok güncellendi (Depo: ${branchId}, Miktar: ${ikasProduct.stock})`);
             } catch (stockErr: any) {
                appendLog(`SKU: ${sku} | Stok GÜNCELLENEMEDİ: ${stockErr.message}`);
             }
        } else {
             appendLog(`SKU: ${sku} | Stok es geçildi (Branch: ${branchId}, Miktar: ${ikasProduct.stock})`);
        }

        // Resimlerin Yüklenmesi
        if (isNewProduct && ikasProduct.images && ikasProduct.images.length > 0) {
            let isMain = true;
            for (const url of ikasProduct.images) {
                if (!url) continue;
                const imageIdStr = await uploadImageToIkas(token, url, productId as string, variantId as string, isMain);
                if (imageIdStr && !imageIdStr.startsWith('HATA:')) {
                   appendLog(`SKU: ${sku} | Resim yüklendi: ${imageIdStr}`);
                } else {
                   appendLog(`SKU: ${sku} | Resim YÜKLENEMEDİ: ${imageIdStr} -> ${url}`);
                }
                isMain = false; // Sadece ilk resim ana resim
                
                // İkas görsel yükleme servisine fazla yüklenmemek için ufak bir mola
                await new Promise(r => setTimeout(r, 700));
            }
        }

        appendLog(`SKU: ${sku} | BAŞARILI (${isNewProduct ? 'Yeni' : 'Güncellendi'})`);
        syncResults.success++;
      } catch (err: any) {
        syncResults.failed++;
        const errObj = {
          sku: xmlProduct.sku || xmlProduct.code || xmlProduct.stok_kodu || 'Bilinmiyor',
          error: err.message
        };
        syncResults.errors.push(errObj);
        appendLog(`SKU: ${errObj.sku} | HATA: ${err.message}`);
      }
      
      // Her ürün arasında Rate Limit (429) yememek için 500ms bekleme
      await new Promise(r => setTimeout(r, 500));
    }

    appendLog(`SYNC BİTTİ. Başarılı: ${syncResults.success}, Hata: ${syncResults.failed}`);
    return NextResponse.json({
      message: 'Sync process finished',
      results: syncResults
    });
    
  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
