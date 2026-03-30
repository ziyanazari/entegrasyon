// src/app/api/v2/sync/route.ts
import { NextResponse } from 'next/server';
import { runV2Sync } from '@/lib/v2/syncFlow';

export async function POST(req: Request) {
    try {
        const { sourceId } = await req.json();
        if (!sourceId) return NextResponse.json({ error: 'sourceId gerekli' }, { status: 400 });

        // Ortak yardımcı fonksiyonu kullan
        const result = await runV2Sync(sourceId);

        return NextResponse.json({ 
            message: 'Senkronizasyon tamamlandı',
            ...result 
        });

    } catch (err: any) {
        console.error('V2 Sync Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
