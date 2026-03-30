import { FieldMapping } from '@prisma/client';

export interface MappedProduct {
    name: string;
    sku: string;
    parentSku: string;
    price: number;
    bayiFiyati: number;  // Ham bayi_fiyati değeri — filtre için her zaman çekilir
    stock: number;
    description: string;
    brand: string | null;
    categories: string[];
    images: string[];
    variantName: string | null;
    [key: string]: any;
}

// XML item'ından fiyat çeker — birden fazla olası alan adını dener
function extractPrice(xmlItem: any, priceField: string): number {
    // Önce config'den gelen alanı dene
    if (xmlItem[priceField] !== undefined && xmlItem[priceField] !== '') {
        const val = parseFloat(String(xmlItem[priceField]).replace(',', '.'));
        if (!isNaN(val)) return val;
    }

    // Ortak Türkçe/İngilizce fallback alanları
    const fallbacks = [
        'bayi_fiyati', 'son_kullanici', 'fiyat', 'satis_fiyati',
        'price', 'Price', 'Fiyat', 'SatisFiyati', 'BirimFiyat',
        'birim_fiyat', 'liste_fiyati', 'PesinFiyat'
    ];

    for (const field of fallbacks) {
        if (field === priceField) continue; // zaten denedik
        if (xmlItem[field] !== undefined && xmlItem[field] !== '') {
            const val = parseFloat(String(xmlItem[field]).replace(',', '.'));
            if (!isNaN(val) && val > 0) return val;
        }
    }

    return 0;
}

export function mapXmlNodeToIkasField(xmlItem: any, mappings: FieldMapping[], priceField: string = 'bayi_fiyati'): MappedProduct {
    // Ham bayi_fiyati değerini her zaman çek (filtre için bağımsız kullanılır)
    const rawBayiFiyati = parseFloat(String(xmlItem.bayi_fiyati || xmlItem.BayiFiyati || xmlItem.bayi_fiyat || '0').replace(',', '.')) || 0;

    const mappedItem: MappedProduct = {
        name: xmlItem.urun_adi || xmlItem.name || xmlItem.Name || xmlItem.UrunAdi || 'Bilinmeyen Ürün',
        sku:  xmlItem.stok_kodu || xmlItem.StokKodu || xmlItem.sku || xmlItem.code || `SKU-${Math.random().toString(36).substr(2, 9)}`,
        parentSku: xmlItem.grup_kodu || xmlItem.GrupKodu || xmlItem.parent_sku || xmlItem.stok_kodu || xmlItem.sku || '',
        price: extractPrice(xmlItem, priceField),
        bayiFiyati: rawBayiFiyati,
        stock: parseInt(String(xmlItem.miktar || xmlItem.stok || xmlItem.Stok || xmlItem.stock || '0').replace(',', '.'), 10),
        description: typeof xmlItem.aciklama === 'string' ? xmlItem.aciklama
                   : typeof xmlItem.description === 'string' ? xmlItem.description
                   : typeof xmlItem.Aciklama === 'string' ? xmlItem.Aciklama : '',
        brand: xmlItem.marka || xmlItem.Marka || xmlItem.brand || null,
        categories: [],
        images: [],
        variantName: xmlItem.secenek_adi || xmlItem.renk || xmlItem.beden || xmlItem.Renk || null,
    };

    // Kategori ayrıştırma
    const katField = xmlItem.kategori || xmlItem.Kategori || xmlItem.category;
    if (katField) {
        if (Array.isArray(katField)) {
            mappedItem.categories = katField;
        } else if (typeof katField === 'string') {
            mappedItem.categories = katField.split('>').map((c: string) => c.trim()).filter(Boolean);
        }
    }

    // Resim ayrıştırma (Resim1, Resim2... veya image URL içeren her alan)
    Object.keys(xmlItem).forEach(key => {
        if (typeof xmlItem[key] === 'string' && xmlItem[key].startsWith('http') &&
           (key.toLowerCase().includes('resim') || key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('picture') || key.toLowerCase().includes('foto'))) {
            if (!mappedItem.images.includes(xmlItem[key])) {
                mappedItem.images.push(xmlItem[key]);
            }
        }
    });

    // Dashboard'dan gelen özel alan eşleştirmeleri
    if (mappings && mappings.length > 0) {
        mappings.forEach(map => {
            if (map.isIgnored) return;
            if (xmlItem[map.xmlNode] !== undefined) {
                if (map.ikasField === 'price') {
                    const v = parseFloat(String(xmlItem[map.xmlNode]).replace(',', '.'));
                    if (!isNaN(v)) mappedItem.price = v;
                } else if (map.ikasField === 'stock') {
                    mappedItem.stock = parseInt(String(xmlItem[map.xmlNode]), 10);
                } else {
                    mappedItem[map.ikasField] = xmlItem[map.xmlNode];
                }
            }
        });
    }

    return mappedItem;
}

export function parseAndMapXml(xmlData: any[], mappings: FieldMapping[], priceField: string = 'bayi_fiyati'): MappedProduct[] {
    if (!Array.isArray(xmlData)) return [];
    return xmlData.map(item => mapXmlNodeToIkasField(item, mappings, priceField));
}
