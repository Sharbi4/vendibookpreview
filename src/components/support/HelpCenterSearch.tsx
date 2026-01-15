import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { helpArticles } from '@/data/helpArticles';
import Fuse from 'fuse.js';

const HelpCenterSearch = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const fuse = useMemo(() => new Fuse(helpArticles, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'category', weight: 0.15 },
      { name: 'sections.title', weight: 0.1 },
      { name: 'sections.content', weight: 0.05 },
    ],
    threshold: 0.4,
    includeScore: true,
  }), []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 6);
  }, [query, fuse]);

  const showResults = isFocused && query.trim().length > 0;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search articles, guides, and tutorials..."
          className="pl-12 pr-4 py-6 text-base bg-background border-2 focus:border-primary"
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm">No articles found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse categories below</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map(({ item }) => (
                <Link
                  key={item.slug}
                  to={`/help/${item.slug}`}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    <span className="text-xs text-primary mt-1 inline-flex items-center gap-1">
                      {item.category}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HelpCenterSearch;
