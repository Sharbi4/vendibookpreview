/**
 * "Use my Featured Boost" — lets an active Vendibook Pro member pick one of
 * their published listings and redeem the existing current-period credit.
 *
 * No new credit system: the listing picker simply hands off to the existing
 * FeaturedListingModal, which already redeems through `pro-boost-redeem`.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { FeaturedListingModal } from '@/components/dashboard/FeaturedListingModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EligibleListing {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
}

const UseBoostCreditDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<EligibleListing | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['boost-eligible-listings', user?.id],
    enabled: !!user?.id && open,
    queryFn: async (): Promise<EligibleListing[]> => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, city, state')
        .eq('host_id', user!.id)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as EligibleListing[];
    },
  });

  if (selected) {
    return (
      <FeaturedListingModal
        open={open}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
          onOpenChange(next);
        }}
        listingId={selected.id}
        listingTitle={selected.title}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Use your Featured Boost
          </DialogTitle>
          <DialogDescription>
            Choose a published listing to feature. Your Pro credit covers this boost — no charge.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !listings?.length ? (
          <p className="py-6 text-sm text-muted-foreground">
            You don&apos;t have a published listing yet. Publish a listing first, then come back to
            use your boost credit.
          </p>
        ) : (
          <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {listings.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setSelected(l)}
                  className="w-full rounded-2xl border border-border/60 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="block truncate text-sm font-medium text-foreground">
                    {l.title}
                  </span>
                  {(l.city || l.state) && (
                    <span className="block text-xs text-muted-foreground">
                      {[l.city, l.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UseBoostCreditDialog;
