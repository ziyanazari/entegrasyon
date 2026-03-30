// src/lib/ikas/orders.ts
import { ikasGraphQLRequest } from './graphqlClient';

export interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  source: string;
}

export interface IkasOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  xmlSource?: string; // Overall source if many items share it
}

export async function getIkasOrders(token: string, limit: number = 50): Promise<IkasOrder[]> {
  const query = `
    query ListOrders($pagination: PaginationInput) {
      listOrder(pagination: $pagination) {
        data {
          id
          orderNumber
          finalTotalPrice
          currency
          createdAt
          status
          customer {
            firstName
            lastName
          }
          orderLineItems {
            id
            variant {
              sku
              product {
                name
                shortDescription
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    pagination: { limit }
  };

  try {
    const result = await ikasGraphQLRequest(token, query, variables);
    const ordersData = result?.listOrder?.data || [];

    return ordersData.map((order: any) => {
      const items: OrderItem[] = (order.orderLineItems || []).map((li: any) => {
        const shortDesc = li.variant?.product?.shortDescription || '';
        const sourceMatch = shortDesc.match(/\[XML_Source: (.*?)\]/);
        const source = sourceMatch ? sourceMatch[1] : 'Manuel';

        return {
          id: li.id,
          productName: li.variant?.product?.name || 'Bilinmeyen Ürün',
          sku: li.variant?.sku || '',
          source
        };
      });

      // Eğer siparişteki herhangi bir ürün XML kaynaklıysa, bu siparişi işaretle
      const xmlSources = Array.from(new Set(items.map(i => i.source).filter(s => s !== 'Manuel')));
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Misafir',
        totalPrice: order.finalTotalPrice,
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt,
        items,
        xmlSource: xmlSources.length > 0 ? xmlSources.join(', ') : undefined
      };
    });
  } catch (err) {
    console.error('Sipariş çekme hatası:', err);
    return [];
  }
}
