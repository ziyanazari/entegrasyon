// src/lib/xmlParser.ts
import { XMLParser } from 'fast-xml-parser';

/**
 * Fetches an XML feed from a given URL and parses it into a JavaScript object.
 * Configuration is synced with the V2 analyzer to ensure consistent field mapping.
 */
export async function fetchAndParseXML(url: string): Promise<any> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch XML from ${url}: ${response.statusText}`);
  }
  
  const xmlData = await response.text();
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '', // V2'de attribute'ları direkt isimle almak için boş bırakıyoruz
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true
  });
  
  return parser.parse(xmlData);
}
