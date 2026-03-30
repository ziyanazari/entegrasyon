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
            attributeNamePrefix: ''
        });
        
        const parsed = parser.parse(xmlText);
        
        // Find the repeating item array (products)
        let items: any[] = [];
        const findArray = (obj: any): any[] | null => {
            if (Array.isArray(obj)) return obj;
            if (typeof obj === 'object' && obj !== null) {
                for (const key of Object.keys(obj)) {
                    const result = findArray(obj[key]);
                    if (result) return result;
                }
            }
            return null;
        };
        
        items = findArray(parsed) || [];
        
        if (items.length === 0) {
            return NextResponse.json({ error: "XML içinde tekrar eden ürün düğümü bulunamadı." }, { status: 400 });
        }
        
        // Extract unique keys from the first 5 items to show as mappable nodes
        const sampleNodes = new Set<string>();
        for (let i = 0; i < Math.min(items.length, 5); i++) {
            Object.keys(items[i]).forEach(k => sampleNodes.add(k));
        }

        return NextResponse.json({ 
            nodes: Array.from(sampleNodes), 
            sampleItem: items[0],
            totalFound: items.length
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
