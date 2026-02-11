import { motion } from 'framer-motion';
import { MessageCircle, Share2, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StorefrontStickyContactProps {
  onMessage: () => void;
  onShare: () => void;
  onViewListings: () => void;
  isMessaging: boolean;
  listingsCount: number;
  listingContext: string | null;
}

const StorefrontStickyContact = ({
  onMessage,
  onShare,
  onViewListings,
  isMessaging,
  listingsCount,
  listingContext,
}: StorefrontStickyContactProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 24 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
    >
      {/* Gradient glow behind */}
      <div className="absolute -top-4 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      <div className="relative bg-gradient-to-r from-[hsl(14,100%,57%)] via-[hsl(20,90%,50%)] to-[hsl(40,100%,49%)] rounded-t-2xl shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.2)]">
        {/* Glass overlay */}
        <div className="absolute inset-0 rounded-t-2xl backdrop-blur-md bg-black/5" />
        
        <div className="relative flex gap-2 px-4 py-3 max-w-lg mx-auto">
          <Button 
            variant="dark-shine"
            onClick={onMessage} 
            disabled={isMessaging}
            className="flex-1 h-11 rounded-xl font-medium shadow-lg"
          >
            {isMessaging ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            {listingContext ? 'Message' : 'Contact Host'}
          </Button>
          <Button 
            onClick={onViewListings}
            className="flex-1 h-11 rounded-xl font-medium bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all"
          >
            <Eye className="h-4 w-4 mr-2" />
            Listings ({listingsCount})
          </Button>
          <Button
            onClick={onShare}
            size="icon"
            className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all flex-shrink-0"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default StorefrontStickyContact;
