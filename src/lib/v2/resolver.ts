import { XmlSource } from '@prisma/client';
import { MappedProduct } from './mapper';

// Groups variations by Parent SKU and applies Price rules
export function groupVariationsAndApplyPrices(mappedProducts: MappedProduct[], config: XmlSource) {
    const grouped: { [parentSku: string]: any } = {};

    mappedProducts.forEach(product => {
        const pSku = product.parentSku || product.sku; // fallback to unique sku
        
        // --- Price Rules ---
        let finalPrice = product.price;
        if (config.profitMargin > 0) {
            finalPrice = finalPrice * (1 + (config.profitMargin / 100));
        }
        if (config.fixedCargoFee > 0) {
            finalPrice = finalPrice + config.fixedCargoFee;
        }

        const variant = {
            sku: product.sku,
            name: product.variantName || product.name,
            price: finalPrice,
            stock: product.stock,
            images: product.images
        };

        if (!grouped[pSku]) {
            // First time seeing this parent
            grouped[pSku] = {
                name: product.name,
                parentSku: pSku,
                description: product.description,
                categories: product.categories,
                brand: product.brand,
                variants: [variant]
            };
        } else {
            // Add variant to existing parent
            grouped[pSku].variants.push(variant);
        }
    });

    return Object.values(grouped);
}
