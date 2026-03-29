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
  const storeName = process.env.IKAS_STORE_NAME || 'denizavm'; 

  if (!clientId || !clientSecret) {
    throw new Error('Missing IKAS API credentials in environment variables.');
  }

  // api.myikas.com adresi global login adresidir
  const url = `https://${storeName}.myikas.com/api/admin/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to fetch ikas token:', errorBody);
    throw new Error(`ikas API returned ${response.status} during authentication`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('Access token missing in the response from ikas');
  }

  // Token cache mechanism
  const expiresIn = data.expires_in ? parseInt(data.expires_in, 10) : 3600;
  tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000; // 1 dakika tolerans
  cachedToken = data.access_token;

  return cachedToken!;
}
