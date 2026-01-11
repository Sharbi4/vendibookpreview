import { useState } from 'react';
import { Search, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
  compact?: boolean;
}

const SearchBar = ({ onSearch, className, compact = false }: SearchBarProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={cn("relative", className)}>
        <div className="flex items-center bg-white border border-border rounded-full shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-2 px-4 py-3 flex-1">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search food trucks, trailers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" className="rounded-full m-1.5 px-5">
            Search
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full max-w-3xl mx-auto", className)}>
      <div className="bg-white border border-border rounded-2xl shadow-lg p-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          {/* Location Input */}
          <div className="flex items-center gap-3 px-4 py-3 flex-1 border-b md:border-b-0 md:border-r border-border">
            <MapPin className="h-5 w-5 text-primary" />
            <input
              type="text"
              placeholder="City or State"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Date Inputs */}
          <div className="flex items-center gap-3 px-4 py-3 flex-1 border-b md:border-b-0 md:border-r border-border">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Booking start date"
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 flex-1">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Booking end date"
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>

          {/* Search Button */}
          <Button type="submit" size="lg" className="rounded-xl mx-2 px-8">
            <Search className="h-5 w-5 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
