// src/lib/ikas/images.ts

/**
 * Uploads an image URL to Ikas REST API.
 * API "OK" (plain text) veya JSON döndürebilir — ikisini de handle eder.
 * 
 * @returns 'OK' veya imageId başarı durumunda, 'HATA:...' hata durumunda
 */
export async function uploadImageToIkas(
  token: string,
  imageUrl: string,
  productId: string,
  variantId: string,
  isMain: boolean = false,
  order: number = 1,
  retryCount: number = 0
): Promise<string> {
  const url = `https://api.myikas.com/api/v1/admin/product/upload/image`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productImage: {
          // Cache busting for Ikas processing
          url: `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${Date.now()}`,
          variantIds: [variantId],
          isMain,
          order
        }
      })
    });

    // Rate limit — bekle ve tekrar dene
    if (response.status === 429) {
      if (retryCount >= 5) {
        return 'HATA: 429 Rate Limit - maksimum deneme aşıldı';
      }
      const retryAfterSec = parseInt(response.headers.get('Retry-After') || '3', 10);
      const waitMs = retryAfterSec * 1000 + 200;
      console.warn(`[Upload Image] 429 Limit, ${waitMs}ms bekleniyor...`);
      await new Promise(r => setTimeout(r, waitMs));
      return uploadImageToIkas(token, imageUrl, productId, variantId, isMain, order, retryCount + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return `HATA: HTTP ${response.status} - ${errorText.substring(0, 200)}`;
    }

    // Ham text oku — API "OK" düz text veya JSON döndürebiliyor
    const rawText = await response.text();

    // "OK" düz text yanıtı = başarı
    if (!rawText || rawText.trim().toUpperCase() === 'OK') {
      return 'OK';
    }

    // JSON parse dene
    try {
      const json = JSON.parse(rawText);
      const imageId = json?.data?.imageId || json?.imageId || json?.id;
      if (imageId) return imageId;
      // JSON ama imageId yok — yine de başarı
      return 'OK';
    } catch {
      // JSON değil ama boş da değil — başarı sayıyoruz
      return 'OK';
    }

  } catch (error: any) {
    return `HATA: İstek Hatası -> ${error.message}`;
  }
}
