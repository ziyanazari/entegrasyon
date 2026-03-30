// src/app/api/xml-count/route.ts
import { NextResponse } from 'next/server';
import { getXmlProductCount } from '@/lib/sync-service';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { xmlUrl } = body;

    if (!xmlUrl || typeof xmlUrl !== 'string') {
      return NextResponse.json({ error: 'xmlUrl gerekli' }, { status: 400 });
    }

    const count = await getXmlProductCount(xmlUrl);

    // Save count to config
    try {
        const configPath = path.join(process.cwd(), 'sync_config.json');
        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const index = configData.configs.findIndex((c: any) => c.url === xmlUrl);
            
            if (index !== -1) {
                configData.configs[index].totalProducts = count;
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
        }
    } catch (e) {}

    return NextResponse.json({
      message: 'XML ürün sayısı çekildi',
      count,
    });

  } catch (error: any) {
    console.error('XML Count API hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
