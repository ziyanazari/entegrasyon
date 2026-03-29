// src/app/api/config/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'sync_config.json');

export async function GET() {
  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify({ configs: [] }, null, 2));
    }
    const data = fs.readFileSync(configPath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'configs bir dizi olmalı' }, { status: 400 });
    }

    fs.writeFileSync(configPath, JSON.stringify({ configs }, null, 2));
    return NextResponse.json({ message: 'Konfigürasyon kaydedildi' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
