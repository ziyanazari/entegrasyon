// src/app/api/sync/route.ts
import { NextResponse } from 'next/server';
import { runSync } from '@/lib/sync-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { xmlUrl, limit } = body;

    if (!xmlUrl || typeof xmlUrl !== 'string') {
      return NextResponse.json({ error: 'xmlUrl gerekli' }, { status: 400 });
    }

    const results = await runSync(xmlUrl, limit);

    return NextResponse.json({
      message: 'Sync tamamlandı',
      results,
    });

  } catch (error: any) {
    console.error('Sync API hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
