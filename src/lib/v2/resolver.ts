import { XmlSource } from '@prisma/client';
import { MappedProduct } from './mapper';

// Groups variations by Parent SKU and applies Price rules
export function groupVariationsAndApplyPrices(mappedProducts: MappedProduct[], config: XmlSource) {
    const grouped: { [parentSku: string]: any } = {};

    mappedProducts.forEach(product => {
        const pSku = product.parentSku || product.sku;

        // 1. Bayi Fiyatı Filtresi — seçilen fiyat alanından bağımsız olarak çalışır
        // Örn: minBayiFiyati=40 → bayi_fiyati < 40 olan ürünler ASLA eklenmez
        if (config.minBayiFiyati > 0 && product.bayiFiyati > 0 && product.bayiFiyati < config.minBayiFiyati) return;

        // 2. Seçili fiyat alanına göre barem filtresi
        if (config.minPrice > 0 && product.price < config.minPrice) return;

        // --- Price Rules ---
        let finalPrice = product.price;
        if (config.profitMargin > 0) {
            finalPrice = finalPrice * (1 + (config.profitMargin / 100));
        }
        if (config.fixedCargoFee > 0) {
            finalPrice = finalPrice + config.fixedCargoFee;
        }
        finalPrice = Math.round(finalPrice * 100) / 100;

        // Kategori ayrıştırma
        const mainCategory = product.categories?.[0] || null;
        const subCategory = product.categories?.[1] || null;

        const variant = {
            sku: product.sku,
            name: product.variantName || product.name,
            sellingPrice: finalPrice,
            price: finalPrice,
            stock: product.stock,
            images: product.images
        };

        if (!grouped[pSku]) {
            grouped[pSku] = {
                name: product.name,
                parentSku: pSku,
                sku: pSku,
                description: product.description,
                categories: product.categories,
                mainCategory,
                subCategory,
                brand: product.brand,
                sellingPrice: finalPrice,
                stock: product.stock,
                images: product.images,
                categoryIds: [],
                variants: [variant]
            };
        } else {
            grouped[pSku].variants.push(variant);
        }
    });

    return Object.values(grouped);
}
