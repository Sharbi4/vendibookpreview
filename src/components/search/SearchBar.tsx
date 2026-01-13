import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { LocationSearchInput } from './LocationSearchInput';

interface SearchBarProps {
  onSearch?: (query: string, dateRange?: DateRange, location?: { name: string; coordinates: [number, number] } | null) => void;
  className?: string;
  compact?: boolean;
}

const SearchBar = ({ onSearch, className, compact = false }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; coordinates: [number, number] } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSearch) {
      onSearch(query, dateRange, selectedLocation);
    } else {
      // Navigate to search page with params
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (dateRange?.from) params.set('start', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.set('end', format(dateRange.to, 'yyyy-MM-dd'));
      if (selectedLocation) {
        params.set('location', query);
        params.set('lat', selectedLocation.coordinates[1].toString());
        params.set('lng', selectedLocation.coordinates[0].toString());
      }
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleLocationSelect = (location: { name: string; coordinates: [number, number] } | null) => {
    setSelectedLocation(location);
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={cn("relative", className)}>
        <div className="flex items-center bg-white border border-border rounded-full shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex-1 px-2">
            <LocationSearchInput
              value={query}
              onChange={setQuery}
              onLocationSelect={handleLocationSelect}
              selectedCoordinates={selectedLocation?.coordinates || null}
              placeholder="Search location..."
              className="border-0 shadow-none [&_input]:border-0 [&_input]:shadow-none [&_input]:bg-transparent"
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
          {/* Location Input with Geolocation & Autocomplete */}
          <div className="flex-1 border-b md:border-b-0 md:border-r border-border">
            <LocationSearchInput
              value={query}
              onChange={setQuery}
              onLocationSelect={handleLocationSelect}
              selectedCoordinates={selectedLocation?.coordinates || null}
              placeholder="City, state, or zip code"
              className="[&_input]:border-0 [&_input]:shadow-none [&_input]:rounded-none [&_input]:py-3"
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
