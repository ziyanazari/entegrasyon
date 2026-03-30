// src/app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { getIkasToken } from '@/lib/ikas/auth';
import { getIkasOrders } from '@/lib/ikas/orders';

export async function GET() {
  try {
    const token = await getIkasToken();
    const allOrders = await getIkasOrders(token);

    // Sadece XML kaynaklı olanları filtrele (User isteği)
    const xmlOrders = allOrders.filter(order => order.xmlSource !== undefined);

    return NextResponse.json({
        orders: xmlOrders
    });
  } catch (error: any) {
    console.error('Sipariş API hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
