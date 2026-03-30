import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: "URL gerekli" }, { status: 400 });

        const res = await fetch(url);
        if (!res.ok) throw new Error("XML kaynağına ulaşılamıyor.");
        
        const xmlText = await res.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true
        });
        
        const parsed = parser.parse(xmlText);
        
        // Tüm dizileri bul ve en uzun olanı (ürün listesi) seç
        let allArrays: { key: string, data: any[] }[] = [];
        const findAllArrays = (obj: any, key: string = 'root') => {
            if (Array.isArray(obj)) {
                allArrays.push({ key, data: obj });
                obj.forEach(item => findAllArrays(item, key));
            } else if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(k => findAllArrays(obj[k], k));
            }
        };
        
        findAllArrays(parsed);
        
        // En çok elemanı olan diziyi ürün listesi kabul et
        const mainArray = allArrays.sort((a, b) => b.data.length - a.data.length)[0];
        const items = mainArray?.data || [];
        
        if (items.length === 0) {
            return NextResponse.json({ error: "XML içinde ürün listesi bulunamadı." }, { status: 400 });
        }
        
        // İlk ürünü derinlemesine tara ve tüm anahtarları (düzleştirilmiş) çıkar
        const sampleNodes = new Set<string>();
        const sampleItem = items[0];

        const extractKeys = (obj: any, prefix: string = '') => {
            if (typeof obj !== 'object' || obj === null) return;
            
            Object.keys(obj).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
                    // Objeyse içeri gir ama anahtarın kendisini de ekle (bazen direkt obje eşleşebilir)
                    sampleNodes.add(fullKey);
                    extractKeys(obj[key], fullKey);
                } else {
                    sampleNodes.add(fullKey);
                }
            });
        };

        extractKeys(sampleItem);

        // UI'da "Fiyat" gibi kelimeleri içerenleri öne çıkarmak için sıralayalım
        const sortedNodes = Array.from(sampleNodes).sort((a, b) => {
            const prioritized = ['fiyat', 'price', 'bayi', 'son', 'kullanici', 'stok', 'stock', 'sku', 'kod', 'name', 'adi'];
            const aMatch = prioritized.some(p => a.toLowerCase().includes(p));
            const bMatch = prioritized.some(p => b.toLowerCase().includes(p));
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return a.localeCompare(b);
        });

        return NextResponse.json({ 
            nodes: sortedNodes, 
            sampleItem: sampleItem, // Orijinal objeyi gönderiyoruz, UI'da erişirken düzleştirilmiş key kullanılacak
            totalFound: items.length,
            mainNode: mainArray.key
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
