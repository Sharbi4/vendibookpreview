import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import ProfileListingsTab from './ProfileListingsTab';
import ProfileReviewsTab from './ProfileReviewsTab';
import { Listing } from '@/types/listing';
import { forwardRef } from 'react';

interface EnhancedPublicProfileTabsProps {
  listings: Listing[] | undefined;
  listingsLoading: boolean;
  reviewsReceived: any;
  reviewsGiven: any;
  reviewsReceivedLoading: boolean;
  reviewsGivenLoading: boolean;
  isOwnProfile: boolean;
  hostVerified: boolean;
  isHost: boolean;
  hostId: string | undefined;
  stats: {
    totalListings?: number;
    totalReviewsReceived?: number;
  } | null;
  responseTime?: string;
  onListingClick?: (listingId: string) => void;
  onMessageHost?: () => void;
  onViewListings?: () => void;
  soldListings?: Listing[];
  soldListingsLoading?: boolean;
  pinnedListingId?: string | null;
}

const EnhancedPublicProfileTabs = forwardRef<HTMLDivElement, EnhancedPublicProfileTabsProps>(({
  listings,
  listingsLoading,
  reviewsReceived,
  reviewsGiven,
  reviewsReceivedLoading,
  reviewsGivenLoading,
  isOwnProfile,
  hostVerified,
  isHost,
  hostId,
  stats,
  responseTime,
  onListingClick,
  onMessageHost,
  onViewListings,
  soldListings,
  soldListingsLoading,
  pinnedListingId,
}, ref) => {
  const tabs = [
    {
      value: 'listings',
      label: 'Listings',
      icon: MapPin,
      count: stats?.totalListings || 0,
      color: 'from-violet-500 to-purple-600',
    },
    {
      value: 'reviews',
      label: 'Reviews',
      icon: Star,
      count: stats?.totalReviewsReceived || 0,
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="container py-4"
    >
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6 p-1.5 h-auto bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl sticky top-0 z-10 border border-white/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  'relative gap-2 py-3 rounded-xl transition-all duration-300',
                  'data-[state=active]:bg-background data-[state=active]:shadow-md',
                  'data-[state=active]:border data-[state=active]:border-border/50'
                )}
              >
                <motion.div
                  className="flex items-center gap-1.5"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                  {tab.count > 0 && (
                    <motion.span 
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      {tab.count}
                    </motion.span>
                  )}
                </motion.div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="listings" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ProfileListingsTab
              listings={listings}
              isLoading={listingsLoading}
              isOwnProfile={isOwnProfile}
              hostVerified={hostVerified}
              hostId={hostId}
              onListingClick={onListingClick}
              soldListings={soldListings}
              soldListingsLoading={soldListingsLoading}
              pinnedListingId={pinnedListingId}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ProfileReviewsTab
              reviewsReceived={reviewsReceived}
              reviewsGiven={reviewsGiven}
              isLoadingReceived={reviewsReceivedLoading}
              isLoadingGiven={reviewsGivenLoading}
              isOwnProfile={isOwnProfile}
              isHost={isHost}
              responseTime={responseTime}
              listingsCount={stats?.totalListings || 0}
              onMessageHost={onMessageHost}
              onViewListings={onViewListings}
            />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
});

EnhancedPublicProfileTabs.displayName = 'EnhancedPublicProfileTabs';

export default EnhancedPublicProfileTabs;
