// src/app/api/v2/sync/route.ts
import { NextResponse } from 'next/server';
import { getIkasToken } from '@/lib/ikas/auth';
import { syncProductsFlow } from '@/lib/v2/syncFlow';
import { fetchAndParseXML } from '@/lib/xmlParser';
import db from '@/lib/v2/db';

export async function POST(req: Request) {
    try {
        const { sourceId } = await req.json();
        if (!sourceId) return NextResponse.json({ error: 'sourceId gerekli' }, { status: 400 });

        // Kaynağı veritabanından çek
        const source = await db.xmlSource.findUnique({ where: { id: sourceId } });
        if (!source) return NextResponse.json({ error: 'Kaynak bulunamadı' }, { status: 404 });

        // XML çek ve parse et
        const xmlData = await fetchAndParseXML(source.url);

        // Ürün dizisini bul (generic finder)
        const findArray = (obj: any): any[] | null => {
            if (Array.isArray(obj) && obj.length > 0) return obj;
            if (typeof obj === 'object' && obj !== null) {
                for (const key of Object.keys(obj)) {
                    const result = findArray(obj[key]);
                    if (result) return result;
                }
            }
            return null;
        };

        const rawItems = findArray(xmlData) || [];

        if (rawItems.length === 0) {
            return NextResponse.json({ error: 'XML içinde ürün bulunamadı.' }, { status: 400 });
        }

        // Ikas token al
        const token = await getIkasToken();

        // Senkronizasyonu başlat
        const result = await syncProductsFlow(sourceId, rawItems, token);

        return NextResponse.json({ 
            message: 'Senkronizasyon tamamlandı',
            ...result 
        });

    } catch (err: any) {
        console.error('V2 Sync Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
