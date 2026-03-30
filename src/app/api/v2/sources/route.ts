import { NextResponse } from 'next/server';
import db from '@/lib/v2/db';

export async function GET() {
    try {
        const sources = await db.xmlSource.findMany({
            include: {
                mappings: true,
                syncLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return NextResponse.json({ sources });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        if (!body.name || !body.url) {
            return NextResponse.json({ error: "XML Adı ve URL zorunludur" }, { status: 400 });
        }
        
        const newSource = await db.xmlSource.create({
            data: {
                name: body.name,
                url: body.url,
                autoSync: false,
            }
        });
        
        return NextResponse.json({ source: newSource });
    } catch (err: any) {
         return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
