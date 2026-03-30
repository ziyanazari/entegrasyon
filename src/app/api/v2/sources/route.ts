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
                priceField: body.priceField || 'bayi_fiyati',
            }
        });
        return NextResponse.json({ source: newSource });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

        const updated = await db.xmlSource.update({
            where: { id },
            data: {
                ...(data.name       !== undefined && { name: data.name }),
                ...(data.minPrice   !== undefined && { minPrice: parseFloat(data.minPrice) }),
                ...(data.profitMargin !== undefined && { profitMargin: parseFloat(data.profitMargin) }),
                ...(data.fixedCargoFee !== undefined && { fixedCargoFee: parseFloat(data.fixedCargoFee) }),
                ...(data.priceField !== undefined && { priceField: data.priceField }),
                ...(data.autoSync   !== undefined && { autoSync: data.autoSync }),
            }
        });
        return NextResponse.json({ source: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
        await db.xmlSource.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
