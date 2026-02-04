import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Listing } from '@/types/listing';

interface SoldListingsCardProps {
  listing: Listing;
}

const SoldListingCard = memo(({ listing }: SoldListingsCardProps) => {
  const imageUrl = listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg';
  
  return (
    <div className="relative group">
      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-80 transition-opacity"
        />
        {/* Sold overlay */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Badge className="bg-green-600/90 text-white border-0 gap-1">
            <CheckCircle className="h-3 w-3" />
            Sold
          </Badge>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium text-muted-foreground line-clamp-1">
          {listing.title}
        </p>
        {listing.price_sale && (
          <p className="text-xs text-muted-foreground/70">
            ${listing.price_sale.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
});
SoldListingCard.displayName = 'SoldListingCard';

interface SoldListingsSectionProps {
  listings: Listing[];
  isLoading?: boolean;
}

const SoldListingsSection = ({ listings, isLoading }: SoldListingsSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !listings || listings.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-10 px-3 text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Recently Sold ({listings.length})
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {listings.map((listing) => (
            <SoldListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground/60 text-center mt-3">
          Showing past sales to demonstrate marketplace activity
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SoldListingsSection;
