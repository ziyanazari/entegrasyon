// src/lib/ikas/images.ts

/**
 * Uploads an image URL to Ikas REST API and returns the associated imageId
 */
export async function uploadImageToIkas(token: string, imageUrl: string, productId: string, variantId: string, isMain: boolean = false, retryCount: number = 0): Promise<string | null> {
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
          url: imageUrl,
          productId: productId,
          variantIds: [variantId],
          isMain: isMain
        }
      })
    });

    if (response.status === 429) {
        if (retryCount > 3) {
           return 'HATA: Limite takıldı (429) ve deneme aşıldı';
        }
        const text = await response.text();
        let retryAfter = 2000;
        try {
            const errBody = JSON.parse(text);
            if (errBody.retryAfter) retryAfter = (errBody.retryAfter * 1000) + 100;
        } catch(e) {}
        console.log(`[Upload Image] 429 Limit. Bekleniyor: ${retryAfter}ms`);
        await new Promise(r => setTimeout(r, retryAfter));
        return uploadImageToIkas(token, imageUrl, productId, variantId, isMain, retryCount + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return `HATA: ${response.status} - ${errorText}`;
    }

    const json = await response.json();
    // Assuming structure is like { data: { imageId: "img_abc" } } or { imageId: "img_abc" }
    const imageId = json?.data?.imageId || json?.imageId;
    
    if (imageId) {
      return imageId;
    } else {
      return `HATA: Sistem imageId dönmedi -> ${JSON.stringify(json)}`;
    }

  } catch (error: any) {
    return `HATA: İstek Hatası -> ${error.message}`;
  }
}
