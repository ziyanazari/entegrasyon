// src/lib/xmlParser.ts
import { XMLParser } from 'fast-xml-parser';
import { IkasProductData } from './ikas/products';

/**
 * Fetches an XML feed from a given URL and parses it into a JavaScript object.
 */
export async function fetchAndParseXML(url: string): Promise<any> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch XML from ${url}: ${response.statusText}`);
  }
  
  const xmlData = await response.text();
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
  });
  
  return parser.parse(xmlData);
}

/**
 * A generic mapping function that attempts to extract common fields.
 * Note: This heavily depends on the specific XML provider's schema and should be customized.
 */
export function mapXmlToIkasProduct(xmlProduct: any): IkasProductData {
  const id = xmlProduct.id?.toString() || '';
  const supplierProductId = xmlProduct.product_id?.toString() || '';
  const name = xmlProduct.adi?.toString() || 'Bilinmeyen Ürün';
  const sku = xmlProduct.stok_kodu?.toString() || '';
  const stock = parseInt(xmlProduct.miktar || '0', 10);
  
  const mainCategory = xmlProduct.AnaKategori?.toString() || '';
  const subCategory = xmlProduct.kategori?.toString() || '';
  
  const sellingPriceStr = xmlProduct.fiyat?.son_kullanici || xmlProduct.son_kullanici || '0';
  const sellingPrice = parseFloat(sellingPriceStr.toString().replace(',', '.'));
  
  const buyingPriceStr = xmlProduct.fiyat?.bayi_fiyati || xmlProduct.bayi_fiyati || '0';
  const buyingPrice = parseFloat(buyingPriceStr.toString().replace(',', '.'));
  
  const currency = xmlProduct.para_birimi?.toString() || 'TL';
  const taxRateStr = xmlProduct.kdv?.toString() || '0';
  const taxRate = parseFloat(taxRateStr.replace(',', '.'));
  
  const brand = xmlProduct.marka?.toString() || '';
  
  // Format filters into a readable string
  let features = '';
  if (xmlProduct.filtreler?.filtre) {
    const filters = Array.isArray(xmlProduct.filtreler.filtre) ? xmlProduct.filtreler.filtre : [xmlProduct.filtreler.filtre];
    features = filters.map((f: any) => `${f.name}: ${f.value}`).join(', ');
  } else if (typeof xmlProduct.filtreler === 'string') {
    features = xmlProduct.filtreler;
  }

  const description = xmlProduct.aciklama?.toString() || '';
  
  let images: string[] = [];
  
  // Resim yapısını çözümleyelim
  if (xmlProduct.resim && typeof xmlProduct.resim === 'object') {
    // <resim><resim1>url</resim1><resim2>url</resim2></resim> 
    images = Object.values(xmlProduct.resim).filter(val => typeof val === 'string' && val.trim() !== '') as string[];
  } else {
    // Veya direkt root seviyesinden <resim1>, <resim2> vs. çekilebilir  
    for (let i = 1; i <= 10; i++) {
        const key = `resim${i}`;
        if (xmlProduct[key] && typeof xmlProduct[key] === 'string' && xmlProduct[key].trim() !== '') {
            images.push(xmlProduct[key]);
        }
    }
  }

  return {
    id,
    supplierProductId,
    name,
    sku,
    stock,
    mainCategory,
    subCategory,
    sellingPrice,
    buyingPrice,
    currency,
    taxRate,
    images,
    brand,
    features,
    description
  };
}
