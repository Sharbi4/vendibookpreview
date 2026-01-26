import { motion } from 'framer-motion';
import { MapPin, Star, Image, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import ProfileListingsTab from './ProfileListingsTab';
import ProfileReviewsTab from './ProfileReviewsTab';
import ProfilePhotosTab from './ProfilePhotosTab';
import { Listing } from '@/types/listing';
import type { UserStats } from '@/hooks/useUserProfile';

interface EnhancedProfileTabsProps {
  listings: Listing[] | undefined;
  listingsLoading: boolean;
  reviewsReceived: any;
  reviewsGiven: any;
  reviewsReceivedLoading: boolean;
  reviewsGivenLoading: boolean;
  isOwnProfile: boolean;
  hostVerified: boolean;
  isHost: boolean;
  stats: UserStats | null;
}

const EnhancedProfileTabs = ({
  listings,
  listingsLoading,
  reviewsReceived,
  reviewsGiven,
  reviewsReceivedLoading,
  reviewsGivenLoading,
  isOwnProfile,
  hostVerified,
  isHost,
  stats,
}: EnhancedProfileTabsProps) => {
  const tabs = [
    {
      value: 'listings',
      label: 'Listings',
      shortLabel: 'List',
      icon: MapPin,
      count: stats?.totalListings || 0,
      color: 'from-violet-500 to-purple-600',
    },
    {
      value: 'reviews',
      label: 'Reviews',
      shortLabel: 'Rev',
      icon: Star,
      count: stats?.totalReviewsReceived || 0,
      color: 'from-amber-500 to-orange-500',
    },
    {
      value: 'photos',
      label: 'Photos',
      shortLabel: 'Photos',
      icon: Image,
      count: null,
      color: 'from-pink-500 to-rose-500',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6 p-1.5 h-auto bg-muted/50 rounded-2xl sticky top-0 z-10 backdrop-blur-lg border border-border/50 shadow-sm">
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
                  <span className="hidden sm:inline font-medium">{tab.label}</span>
                  <span className="sm:hidden font-medium">{tab.shortLabel}</span>
                  {tab.count !== null && tab.count > 0 && (
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
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="photos" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ProfilePhotosTab
              listings={listings}
              isLoading={listingsLoading}
              isOwnProfile={isOwnProfile}
            />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default EnhancedProfileTabs;
