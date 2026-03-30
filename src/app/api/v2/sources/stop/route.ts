import { NextResponse } from 'next/server';
import db from '@/lib/v2/db';

export async function POST(req: Request) {
    try {
        const { sourceId } = await req.json();
        if (!sourceId) return NextResponse.json({ error: 'sourceId gerekli' }, { status: 400 });

        // isSyncing değerini false yaparak devam eden işlemi döngü başında durdurur
        const updated = await db.xmlSource.update({
            where: { id: sourceId },
            data: { isSyncing: false }
        });

        console.log(`[API Stop] ${updated.name} için durdurma emri gönderildi.`);

        return NextResponse.json({ 
            message: 'Durdurma emri gonderildi. Mevcut paket bitince islem sonlandirilacak.',
            source: updated 
        });

    } catch (err: any) {
        console.error('Stop Sync Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
