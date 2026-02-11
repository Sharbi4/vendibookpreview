import { motion } from 'framer-motion';
import { Truck, Building2, MapPin, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Listing } from '@/types/listing';

interface StorefrontCategoryShowcaseProps {
  listings: Listing[] | undefined;
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Truck; gradient: string }> = {
  food_truck: {
    label: 'Food Trucks',
    icon: Truck,
    gradient: 'from-[hsl(14,100%,57%)]/15 to-[hsl(25,95%,55%)]/10',
  },
  food_trailer: {
    label: 'Food Trailers',
    icon: Truck,
    gradient: 'from-[hsl(40,100%,49%)]/15 to-[hsl(30,90%,50%)]/10',
  },
  ghost_kitchen: {
    label: 'Commercial Kitchens',
    icon: Building2,
    gradient: 'from-[hsl(220,80%,55%)]/15 to-[hsl(200,70%,50%)]/10',
  },
  vendor_space: {
    label: 'Vendor Spaces',
    icon: MapPin,
    gradient: 'from-[hsl(150,60%,45%)]/15 to-[hsl(160,50%,40%)]/10',
  },
};

const StorefrontCategoryShowcase = ({ listings }: StorefrontCategoryShowcaseProps) => {
  if (!listings || listings.length === 0) return null;

  // Group listings by category
  const categories = listings.reduce((acc, listing) => {
    const cat = listing.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(listing);
    return acc;
  }, {} as Record<string, Listing[]>);

  const categoryEntries = Object.entries(categories);
  if (categoryEntries.length <= 1) return null; // Only show if host has multiple categories

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Warm gradient background band */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)]/8 via-[hsl(25,95%,55%)]/5 to-[hsl(40,100%,49%)]/8" />
        
        <div className="relative p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">What this host offers</h3>
          <p className="text-sm text-muted-foreground mb-5">Browse by asset type</p>

          <div className={cn(
            "grid gap-4",
            categoryEntries.length === 2 ? "grid-cols-2" :
            categoryEntries.length === 3 ? "grid-cols-3" :
            "grid-cols-2 md:grid-cols-4"
          )}>
            {categoryEntries.map(([cat, items], i) => {
              const meta = CATEGORY_META[cat] || { label: cat, icon: ShoppingBag, gradient: 'from-muted/20 to-muted/10' };
              const Icon = meta.icon;
              const coverImage = items[0]?.cover_image_url || items[0]?.image_urls?.[0];

              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.1 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                  className={cn(
                    "relative rounded-xl overflow-hidden cursor-pointer group",
                    "border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300"
                  )}
                >
                  {/* Background */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br", meta.gradient)} />
                  
                  {/* Cover image hint */}
                  {coverImage && (
                    <div className="absolute inset-0">
                      <img src={coverImage} alt="" className="w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity" />
                    </div>
                  )}

                  <div className="relative p-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-foreground/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-foreground/15 transition-colors">
                      <Icon className="h-6 w-6 text-foreground" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {items.length} listing{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default StorefrontCategoryShowcase;
