import { FieldMapping } from '@prisma/client';

export interface MappedProduct {
    name: string;
    sku: string;
    parentSku: string;
    price: number;
    stock: number;
    description: string;
    brand: string | null;
    categories: string[];
    images: string[];
    variantName: string | null;
    [key: string]: any;
}

export function mapXmlNodeToIkasField(xmlItem: any, mappings: FieldMapping[]): MappedProduct {
    const mappedItem: MappedProduct = {
        name: xmlItem.urun_adi || xmlItem.name || 'Bilinmeyen Ürün',
        sku: xmlItem.stok_kodu || xmlItem.sku || `SKU-${Math.random().toString(36).substr(2, 9)}`,
        parentSku: xmlItem.grup_kodu || xmlItem.parent_sku || xmlItem.stok_kodu || xmlItem.sku,
        price: parseFloat(xmlItem.fiyat || xmlItem.satis_fiyati || '0'),
        stock: parseInt(xmlItem.miktar || xmlItem.stok || '0', 10),
        description: typeof xmlItem.aciklama === 'string' ? xmlItem.aciklama : (typeof xmlItem.description === 'string' ? xmlItem.description : ''),
        brand: xmlItem.marka || xmlItem.brand || null,
        categories: [],
        images: [],
        variantName: xmlItem.secenek_adi || xmlItem.renk || xmlItem.beden || null,
    };

    // Auto category extraction fallback
    if (xmlItem.kategori) {
        if (Array.isArray(xmlItem.kategori)) {
            mappedItem.categories = xmlItem.kategori;
        } else if (typeof xmlItem.kategori === 'string') {
            mappedItem.categories = xmlItem.kategori.split('>').map((c: string) => c.trim());
        }
    }

    // Extract images dynamically (Resim1, Resim2... or images[])
    Object.keys(xmlItem).forEach(key => {
        if (typeof xmlItem[key] === 'string' && xmlItem[key].startsWith('http') && 
           (key.toLowerCase().includes('resim') || key.toLowerCase().includes('image') || key.toLowerCase().includes('picture'))) {
            mappedItem.images.push(xmlItem[key]);
        }
    });

    // Custom UI Overrides
    if (mappings && mappings.length > 0) {
        mappings.forEach(map => {
            if (map.isIgnored) return;
            if (xmlItem[map.xmlNode] !== undefined) {
                if (map.ikasField === 'price') mappedItem.price = parseFloat(xmlItem[map.xmlNode]);
                else if (map.ikasField === 'stock') mappedItem.stock = parseInt(xmlItem[map.xmlNode], 10);
                else (mappedItem as any)[map.ikasField] = xmlItem[map.xmlNode];
            }
        });
    }

    return mappedItem;
}

export function parseAndMapXml(xmlData: any[], mappings: FieldMapping[]): MappedProduct[] {
    if (!Array.isArray(xmlData)) return [];
    return xmlData.map(item => mapXmlNodeToIkasField(item, mappings));
}
