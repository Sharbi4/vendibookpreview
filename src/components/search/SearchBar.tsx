import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface SearchBarProps {
  onSearch?: (query: string, dateRange?: DateRange) => void;
  className?: string;
  compact?: boolean;
}

const SearchBar = ({ onSearch, className, compact = false }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSearch) {
      onSearch(query, dateRange);
    } else {
      // Navigate to search page with params
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (dateRange?.from) params.set('start', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.set('end', format(dateRange.to, 'yyyy-MM-dd'));
      navigate(`/search?${params.toString()}`);
    }
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

          {/* Date Range Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-3 px-4 py-3 flex-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div className="flex-1 text-left">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-foreground text-sm">
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </span>
                    ) : (
                      <span className="text-foreground text-sm">
                        {format(dateRange.from, 'MMM d, yyyy')}
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground text-sm">Select dates</span>
                  )}
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]" align="center">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.from && range?.to) {
                    setIsCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
                disabled={(date) => date < new Date()}
                className={cn("p-3 pointer-events-auto")}
                initialFocus
              />
            </PopoverContent>
          </Popover>

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
