// src/lib/ikas/auth.ts

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Fetches an access token from ikas API using Client Credentials flow
 */
export async function getIkasToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.IKAS_CLIENT_ID;
  const clientSecret = process.env.IKAS_CLIENT_SECRET;
  // ebijuteri = ebijuteri.myikas.com — store name'i .env'den al
  const storeName = process.env.IKAS_STORE_NAME || 'ebijuteri';

  if (!clientId || !clientSecret) {
    throw new Error('IKAS_CLIENT_ID veya IKAS_CLIENT_SECRET eksik. Lütfen .env.local dosyasını kontrol edin.');
  }

  const url = `https://${storeName}.myikas.com/api/admin/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Ikas token alınamadı:', errorBody);
    throw new Error(`Ikas API authentication ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Ikas yanıtında access_token bulunamadı: ' + JSON.stringify(data));
  }

  const expiresIn = data.expires_in ? parseInt(data.expires_in, 10) : 3600;
  tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000;
  cachedToken = data.access_token;

  return cachedToken!;
}
