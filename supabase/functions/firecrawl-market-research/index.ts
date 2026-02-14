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

    // Build multiple search queries to cast a wider net
    const searchQueries: string[] = [];
    
    const typeLabel = listing_type === 'rent' ? 'for rent' : listing_type === 'sale' ? 'for sale' : '';
    const loc = location?.trim() || 'United States';

    // Search across multiple platforms
    searchQueries.push(`"food truck" ${typeLabel} ${loc} phone contact`);
    searchQueries.push(`"food trailer" ${typeLabel} ${loc} phone contact`);
    searchQueries.push(`site:facebook.com/marketplace "food truck" ${typeLabel} ${loc}`);
    searchQueries.push(`site:craigslist.org "food truck" OR "food trailer" ${typeLabel}`);
    if (query !== 'food truck' && query !== 'food trailer') {
      searchQueries.push(`${query} ${typeLabel} ${loc} phone contact`);
    }

    console.log('Running', searchQueries.length, 'search queries');

    // Run all searches in parallel
    const allResults: any[] = [];

    const fetchResults = async (q: string) => {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: q,
            limit: 20,
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        const data = await response.json();
        if (response.ok && data.data) {
          return data.data;
        }
        console.error('Search failed for query:', q, data.error);
        return [];
      } catch (err) {
        console.error('Fetch error for query:', q, err);
        return [];
      }
    };

    const resultSets = await Promise.all(searchQueries.map(fetchResults));
    for (const set of resultSets) {
      allResults.push(...set);
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueResults: any[] = [];
    for (const r of allResults) {
      const url = r.url || '';
      if (url && seenUrls.has(url)) continue;
      if (url) seenUrls.add(url);
      uniqueResults.push(r);
    }

    // Extract phone numbers using multiple patterns
    const phoneRegex = /(?:(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4})/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    const enrichedResults = uniqueResults.map((result: any) => {
      const content = [
        result.markdown || '',
        result.description || '',
        result.title || '',
      ].join(' ');
      
      const rawPhones = content.match(phoneRegex) || [];
      // Filter out unlikely phone numbers (too short, all same digit, etc.)
      const validPhones = rawPhones
        .map((p: string) => p.trim())
        .filter((p: string) => {
          const digits = p.replace(/\D/g, '');
          if (digits.length < 10 || digits.length > 11) return false;
          if (/^(.)\1+$/.test(digits)) return false; // all same digit
          return true;
        });
      const uniquePhones = [...new Set(validPhones)];

      const emails = content.match(emailRegex) || [];
      const uniqueEmails = [...new Set(emails.map((e: string) => e.toLowerCase()))];

      return {
        title: result.title || 'Untitled',
        url: result.url || '',
        description: result.description || '',
        snippet: result.markdown?.substring(0, 500) || '',
        phones: uniquePhones,
        emails: uniqueEmails,
      };
    });

    console.log(`Found ${enrichedResults.length} unique results, ${enrichedResults.filter((r: any) => r.phones.length > 0).length} with phones`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: enrichedResults,
        query: searchQueries[0],
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
