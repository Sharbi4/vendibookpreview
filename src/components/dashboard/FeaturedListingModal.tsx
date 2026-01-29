import { useState } from 'react';
import { Star, TrendingUp, Eye, Award, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeaturedListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
}

const benefits = [
  {
    icon: TrendingUp,
    title: '3× More Visibility',
    description: 'Featured listings appear at the top of search results and category pages.',
  },
  {
    icon: Eye,
    title: 'Priority Placement',
    description: 'Stand out with a highlighted badge and premium positioning.',
  },
  {
    icon: Award,
    title: '30 Days of Exposure',
    description: 'Your listing stays featured for a full month, maximizing your reach.',
  },
  {
    icon: Star,
    title: 'Featured Badge',
    description: 'A distinctive star badge makes your listing instantly recognizable.',
  },
];

export const FeaturedListingModal = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
}: FeaturedListingModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddNow = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-featured-checkout', {
        body: { listingId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Featured checkout error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Make Your Listing Featured
          </DialogTitle>
          <DialogDescription>
            Boost "{listingTitle}" to the top of search results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <benefit.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">One-time fee</span>
            <span className="text-2xl font-bold text-foreground">$25</span>
          </div>
          <Button
            variant="dark-shine"
            className="w-full rounded-xl h-12"
            onClick={handleAddNow}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Star className="h-4 w-4 mr-2" />
            )}
            Add Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
