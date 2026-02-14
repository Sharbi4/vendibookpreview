import { useState } from 'react';
import { Search, ExternalLink, Phone, Loader2, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  snippet: string;
  phones: string[];
}

const MarketResearchCard = () => {
  const [query, setQuery] = useState('food truck');
  const [location, setLocation] = useState('');
  const [listingType, setListingType] = useState<string>('sale');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Enter a search query');
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-market-research', {
        body: {
          query: query.trim(),
          location: location.trim() || undefined,
          listing_type: listingType || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.results || []);
        setSearchQuery(data.query || '');
        toast.success(`Found ${data.count} results`);
      } else {
        toast.error(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search. Check Firecrawl connector.');
    } finally {
      setIsSearching(false);
    }
  };

  const resultsWithPhones = results.filter((r) => r.phones.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Facebook Marketplace Research
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search Facebook Marketplace for food trucks, trailers, and vendor spaces — for research purposes only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Search term (e.g. food truck)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Input
              placeholder="Location (e.g. Houston TX)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger>
                <SelectValue placeholder="Listing type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">For Sale</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isSearching} className="w-full">
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {searchQuery && (
            <p className="text-xs text-muted-foreground">
              Query: <code className="bg-muted px-1 rounded">{searchQuery}</code>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Results</p>
              <p className="text-2xl font-bold">{results.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">With Phone Numbers</p>
              <p className="text-2xl font-bold text-emerald-600">{resultsWithPhones.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Phones Found</p>
              <p className="text-2xl font-bold text-blue-600">
                {results.reduce((sum, r) => sum + r.phones.length, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {results.map((result, idx) => (
        <Card key={idx} className="overflow-hidden">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{result.title}</h3>
                {result.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                )}
              </div>
              {result.url && (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </a>
              )}
            </div>

            {result.phones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.phones.map((phone, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {phone}
                  </Badge>
                ))}
              </div>
            )}

            {result.snippet && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show scraped content
                </summary>
                <pre className="mt-2 bg-muted p-2 rounded text-xs whitespace-pre-wrap max-h-40 overflow-auto">
                  {result.snippet}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      ))}

      {isSearching && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Searching Facebook Marketplace via Firecrawl...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketResearchCard;
