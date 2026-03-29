import { fetchAndParseXML, mapXmlToIkasProduct } from './src/lib/xmlParser';

async function test() {
    const xmlUrl = 'http://xml.ebijuteri.com/api/xml/69c7a7400dc8522e600426f4?format=old';
    try {
        console.log('Fetching XML...');
        const xmlData = await fetchAndParseXML(xmlUrl);
        const rootKeys = Object.keys(xmlData).filter(k => k !== '?xml');
        const rootKey = rootKeys[0];
        
        let productsArray: any[] = [];
        
        if (rootKey) {
          const rootObj = xmlData[rootKey];
          if (rootObj?.Urun) {
              productsArray = Array.isArray(rootObj.Urun) ? rootObj.Urun : [rootObj.Urun];
          }
        }
        
        console.log(`Found ${productsArray.length} products.`);
        if (productsArray.length > 0) {
            const firstProduct = productsArray[0];

            const mapped = mapXmlToIkasProduct(firstProduct);
            console.log('\n--- Mapped Ikas Product ---');
            console.log(JSON.stringify(mapped, null, 2));
        }
        
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
