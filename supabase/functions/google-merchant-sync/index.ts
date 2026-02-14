import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Generate a JWT for Google Service Account auth
async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/content',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get access token: ${tokenRes.status} ${errText}`);
  }

  const tokenData: GoogleTokenResponse = await tokenRes.json();
  return tokenData.access_token;
}

// Map a listing to Google Merchant product format
function mapListingToProduct(listing: Record<string, unknown>, merchantId: string): Record<string, unknown> {
  const isRental = listing.mode === 'rent';
  const price = isRental
    ? (listing.price_daily || listing.price_hourly || 0)
    : (listing.price_sale || 0);

  const categoryMap: Record<string, string> = {
    food_truck: 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans',
    food_trailer: 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans',
    commercial_kitchen: 'Business & Industrial > Food Service > Commercial Kitchen Equipment',
    vendor_space: 'Business & Industrial > Retail > Retail Fixtures',
  };

  const availability = listing.status === 'published' ? 'in_stock' : 'out_of_stock';

  const product: Record<string, unknown> = {
    offerId: listing.id as string,
    title: (listing.title as string || '').substring(0, 150),
    description: (listing.description as string || '').substring(0, 5000),
    link: `https://vendibook.com/listing/${listing.id}`,
    imageLink: listing.cover_image_url || (listing.image_urls as string[] || [])[0] || '',
    contentLanguage: 'en',
    targetCountry: 'US',
    channel: 'online',
    availability,
    condition: 'used',
    price: {
      value: String(price),
      currency: 'USD',
    },
    brand: 'VendiBook',
    googleProductCategory: categoryMap[listing.category as string] || 'Business & Industrial',
    customAttributes: [
      { name: 'listing_mode', value: isRental ? 'rental' : 'sale' },
      { name: 'city', value: (listing.city as string) || '' },
      { name: 'state', value: (listing.state as string) || '' },
    ],
  };

  // Add additional images
  const imageUrls = listing.image_urls as string[] | null;
  if (imageUrls && imageUrls.length > 1) {
    product.additionalImageLinks = imageUrls.slice(1, 11); // Max 10 additional
  }

  return product;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const merchantId = Deno.env.get('GOOGLE_MERCHANT_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

    if (!merchantId || !serviceAccountJson) {
      throw new Error('Missing GOOGLE_MERCHANT_ID or GOOGLE_SERVICE_ACCOUNT_JSON');
    }

    // Parse service account JSON - handle various encoding scenarios
    let serviceAccount;
    let rawJson = serviceAccountJson.trim();
    
    // Remove surrounding quotes if present
    if ((rawJson.startsWith('"') && rawJson.endsWith('"')) || (rawJson.startsWith("'") && rawJson.endsWith("'"))) {
      rawJson = rawJson.slice(1, -1);
    }
    
    // Unescape common escape sequences
    rawJson = rawJson.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    try {
      serviceAccount = JSON.parse(rawJson);
    } catch (e1) {
      console.error('First parse attempt failed:', (e1 as Error).message);
      console.error('First 100 chars of raw value:', rawJson.substring(0, 100));
      // Try parsing without the unescape step
      try {
        serviceAccount = JSON.parse(serviceAccountJson.trim());
      } catch (e2) {
        console.error('Second parse attempt failed:', (e2 as Error).message);
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format. Ensure you paste the raw JSON file contents without extra quotes or escaping.');
      }
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Service account JSON missing client_email or private_key fields');
    }

    const accessToken = await getAccessToken(serviceAccount);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all published listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'published')
      .not('title', 'ilike', 'Demo %');

    if (listingsError) throw listingsError;
    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No listings to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing ${listings.length} listings to Google Merchant Center...`);

    // Use batch insert for efficiency (Content API v2.1 custombatch)
    const batchEntries = listings.map((listing, index) => ({
      batchId: index + 1,
      merchantId,
      method: 'insert',
      product: mapListingToProduct(listing, merchantId),
    }));

    // Google allows max 10,000 per batch, chunk if needed
    const BATCH_SIZE = 1000;
    let totalSucceeded = 0;
    let totalFailed = 0;
    const errors: Array<{ offerId: string; error: string }> = [];

    for (let i = 0; i < batchEntries.length; i += BATCH_SIZE) {
      const chunk = batchEntries.slice(i, i + BATCH_SIZE);

      const batchRes = await fetch(
        'https://shoppingcontent.googleapis.com/content/v2.1/products/batch',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entries: chunk }),
        }
      );

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        console.error(`Batch request failed: ${batchRes.status} ${errText}`);
        totalFailed += chunk.length;
        continue;
      }

      const batchResult = await batchRes.json();

      if (batchResult.entries) {
        for (const entry of batchResult.entries) {
          if (entry.errors && entry.errors.errors && entry.errors.errors.length > 0) {
            totalFailed++;
            const offerId = chunk[entry.batchId - 1]?.product?.offerId || 'unknown';
            errors.push({
              offerId,
              error: entry.errors.errors.map((e: { message: string }) => e.message).join('; '),
            });
          } else {
            totalSucceeded++;
          }
        }
      }
    }

    console.log(`Sync complete: ${totalSucceeded} succeeded, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total_listings: listings.length,
        synced: totalSucceeded,
        failed: totalFailed,
        errors: errors.slice(0, 20), // Return first 20 errors for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Merchant sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
