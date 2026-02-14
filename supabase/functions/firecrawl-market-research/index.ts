const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, location, listing_type } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a targeted search query for Facebook Marketplace
    let searchQuery = `site:facebook.com/marketplace ${query}`;
    if (location) searchQuery += ` ${location}`;
    if (listing_type === 'sale') searchQuery += ' for sale';
    if (listing_type === 'rent') searchQuery += ' for rent';

    console.log('Firecrawl market research query:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 20,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract phone numbers from results using regex
    const phoneRegex = /(\+?1?\s*[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    
    const enrichedResults = (data.data || []).map((result: any) => {
      const content = (result.markdown || '') + ' ' + (result.description || '');
      const phones = content.match(phoneRegex) || [];
      const uniquePhones = [...new Set(phones.map((p: string) => p.trim()))];

      return {
        title: result.title || 'Untitled',
        url: result.url || '',
        description: result.description || '',
        snippet: result.markdown?.substring(0, 500) || '',
        phones: uniquePhones,
      };
    });

    console.log(`Found ${enrichedResults.length} results`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: enrichedResults,
        query: searchQuery,
        count: enrichedResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Market research error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
