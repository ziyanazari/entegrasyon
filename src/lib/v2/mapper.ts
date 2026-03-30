import { FieldMapping } from '@prisma/client';

export interface MappedProduct {
    name: string;
    sku: string;
    parentSku: string;
    price: number;
    bayiFiyati: number;
    stock: number;
    description: string;
    brand: string | null;
    categories: string[];
    images: string[];
    variantName: string | null;
    [key: string]: any;
}

/**
 * Nesnelerden iç içe geçmiş (dot notation) değerleri güvenli bir şekilde çeker.
 * Örn: getNestedValue(item, "Fiyatlar.bayi_fiyati")
 */
function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current[part] === undefined) return undefined;
        current = current[part];
    }
    return current;
}

function parsePrice(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    const clean = String(val).replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

// XML item'ından fiyat çeker — birden fazla olası alan adını dener
function extractPrice(xmlItem: any, priceField: string): number {
    // 1. Kullanıcının seçtiği alan (iç içe olabilir: Fiyatlar.bayi_fiyati)
    const selectedVal = getNestedValue(xmlItem, priceField);
    if (selectedVal !== undefined) {
        const val = parsePrice(selectedVal);
        if (val > 0) return val;
    }

    // 2. Ortak Türkçe/İngilizce fallback alanları
    const fallbacks = [
        'bayi_fiyati', 'son_kullanici', 'fiyat', 'satis_fiyati',
        'price', 'Price', 'Fiyat', 'SatisFiyati', 'BirimFiyat',
        'birim_fiyat', 'liste_fiyati', 'PesinFiyat',
        'Fiyatlar.bayi_fiyati', 'Fiyatlar.son_kullanici', 'fiyatlar.fiyat'
    ];

    for (const field of fallbacks) {
        if (field === priceField) continue;
        const raw = getNestedValue(xmlItem, field);
        if (raw !== undefined) {
            const val = parsePrice(raw);
            if (val > 0) return val;
        }
    }

    return 0;
}

export function mapXmlNodeToIkasField(xmlItem: any, mappings: FieldMapping[], priceField: string = 'bayi_fiyati'): MappedProduct {
    // Ham bayi_fiyati değerini her zaman çek (filtre için bayi_fiyati ismine veya nested haline bakar)
    const rawBayiFiyati = parsePrice(getNestedValue(xmlItem, 'bayi_fiyati') || getNestedValue(xmlItem, 'Fiyatlar.bayi_fiyati') || 0);

    const mappedItem: MappedProduct = {
        name: String(getNestedValue(xmlItem, 'urun_adi') || getNestedValue(xmlItem, 'name') || getNestedValue(xmlItem, 'Name') || 'Bilinmeyen Ürün'),
        sku:  String(getNestedValue(xmlItem, 'stok_kodu') || getNestedValue(xmlItem, 'StokKodu') || getNestedValue(xmlItem, 'sku') || getNestedValue(xmlItem, 'code') || `SKU-${Math.random().toString(36).substr(2, 9)}`),
        parentSku: String(getNestedValue(xmlItem, 'grup_kodu') || getNestedValue(xmlItem, 'GrupKodu') || getNestedValue(xmlItem, 'parent_sku') || ''),
        price: extractPrice(xmlItem, priceField),
        bayiFiyati: rawBayiFiyati,
        stock: Math.floor(parsePrice(getNestedValue(xmlItem, 'miktar') || getNestedValue(xmlItem, 'stok') || getNestedValue(xmlItem, 'stock') || '0')),
        description: String(getNestedValue(xmlItem, 'aciklama') || getNestedValue(xmlItem, 'description') || ''),
        brand: String(getNestedValue(xmlItem, 'marka') || getNestedValue(xmlItem, 'brand') || ''),
        categories: [],
        images: [],
        variantName: String(getNestedValue(xmlItem, 'secenek_adi') || getNestedValue(xmlItem, 'renk') || ''),
    };

    // Eğer parentSku boşsa sku ile aynı yapalım
    if (!mappedItem.parentSku || mappedItem.parentSku === 'undefined') mappedItem.parentSku = mappedItem.sku;

    // Kategori ayrıştırma
    const kat = getNestedValue(xmlItem, 'kategori') || getNestedValue(xmlItem, 'category');
    if (kat) {
        if (Array.isArray(kat)) mappedItem.categories = kat.map(String);
        else if (typeof kat === 'string') mappedItem.categories = kat.split('>').map(c => c.trim()).filter(Boolean);
    }

    // Resim toplama (Her seviyeyi tara)
    const collectImages = (obj: any) => {
        if (!obj) return;
        if (typeof obj === 'string' && obj.startsWith('http')) {
            if (/\.(jpg|jpeg|png|gif|webp)/i.test(obj)) {
                if (!mappedItem.images.includes(obj)) mappedItem.images.push(obj);
            }
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(collectImages);
        }
    };
    collectImages(xmlItem);

    // Dashboard'dan gelen özel alan eşleştirmeleri
    if (mappings && mappings.length > 0) {
        mappings.forEach(map => {
            if (map.isIgnored) return;
            const val = getNestedValue(xmlItem, map.xmlNode);
            if (val !== undefined) {
                if (map.ikasField === 'price') mappedItem.price = parsePrice(val);
                else if (map.ikasField === 'stock') mappedItem.stock = Math.floor(parsePrice(val));
                else mappedItem[map.ikasField] = val;
            }
        });
    }

    return mappedItem;
}

export function parseAndMapXml(xmlData: any[], mappings: FieldMapping[], priceField: string = 'bayi_fiyati'): MappedProduct[] {
    if (!Array.isArray(xmlData)) return [];
    return xmlData.map(item => mapXmlNodeToIkasField(item, mappings, priceField));
}
