import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';
import { CATEGORY_LABELS } from '@/types/listing';

interface RelatedListing {
  id: string;
  title: string;
  cover_image_url: string | null;
  price_daily: number | null;
  price_sale: number | null;
  mode: string;
  category: string;
  address: string | null;
}

interface RelatedListingsProps {
  listingId: string;
  category: string;
  mode: string;
  address: string | null;
}

const RelatedListings = ({ listingId, category, mode, address }: RelatedListingsProps) => {
  const [listings, setListings] = useState<RelatedListing[]>([]);

  useEffect(() => {
    const fetchRelated = async () => {
      // Extract city from address for locality matching
      const addressParts = address?.split(',').map(s => s.trim()) || [];
      const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : null;

      const { data } = await supabase
        .from('listings')
        .select('id, title, cover_image_url, price_daily, price_sale, mode, category, address')
        .eq('status', 'published')
        .neq('id', listingId)
        .eq('category', category as any)
        .eq('mode', mode as any)
        .limit(6);

      

      if (data && data.length > 0) {
        // Sort: same city first
        const sorted = city
          ? [...data].sort((a, b) => {
              const aMatch = a.address?.includes(city) ? 0 : 1;
              const bMatch = b.address?.includes(city) ? 0 : 1;
              return aMatch - bMatch;
            })
          : data;
        setListings(sorted.slice(0, 6));
      }
    };

    fetchRelated();
  }, [listingId, category, mode, address]);

  if (listings.length === 0) return null;

  const categoryLabel = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || 'Listings';
  const cityName = address?.split(',').slice(-2, -1)[0]?.trim();
  const sectionTitle = cityName
    ? `Similar ${categoryLabel} near ${cityName}`
    : `More ${categoryLabel}`;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{sectionTitle}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {listings.map((l) => {
          const locationShort = l.address?.split(',').slice(-2).join(',').trim();
          const price = l.mode === 'rent' ? l.price_daily : l.price_sale;
          const priceLabel = l.mode === 'rent' ? '/day' : '';

          return (
            <Link
              key={l.id}
              to={`/listing/${l.id}`}
              className="group rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={l.cover_image_url || '/placeholder.svg'}
                  alt={`${l.title} - ${categoryLabel} ${l.mode === 'rent' ? 'for Rent' : 'for Sale'}${cityName ? ` in ${cityName}` : ''}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-1">
                <h3 className="text-sm font-medium text-foreground line-clamp-1">{l.title}</h3>
                {locationShort && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {locationShort}
                  </p>
                )}
                {price != null && (
                  <p className="text-sm font-semibold text-foreground">
                    ${price.toLocaleString()}{priceLabel}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedListings;
