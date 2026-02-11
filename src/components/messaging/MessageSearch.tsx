import { useState, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface SearchResult {
  id: string;
  message: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
}

const MessageSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!user || !query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Get user's conversation IDs
      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .or(`host_id.eq.${user.id},shopper_id.eq.${user.id}`);

      if (!convos || convos.length === 0) {
        setResults([]);
        return;
      }

      const convoIds = convos.map(c => c.id);

      const { data, error } = await supabase
        .from('conversation_messages')
        .select('id, message, created_at, conversation_id, sender_id')
        .in('conversation_id', convoIds)
        .ilike('message', `%${query.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages..."
            className="pl-9 pr-9"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={clearSearch}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch} size="sm" disabled={!query.trim() || isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {hasSearched && (
        <div className="space-y-1">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages found matching "{query}"
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.map((result) => (
                <Link
                  key={result.id}
                  to={`/messages/${result.conversation_id}`}
                  className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <p className="text-sm text-foreground line-clamp-2">{result.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(result.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageSearch;
