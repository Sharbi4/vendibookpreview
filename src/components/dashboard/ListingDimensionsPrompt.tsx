/**
 * Dimension backfill prompt for older for-sale listings.
 *
 * Length/height became required for mobile assets after some listings were
 * already published, so those rows sit live without the measurements buyers
 * need for fit, transport and freight quotes. This surfaces a subtle nudge on
 * the owner's dashboard card and saves straight back to the listing — no
 * republish, no full wizard trip.
 */

import { useMemo, useState } from 'react';
import { Ruler, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { requiresSaleDimensions } from '@/lib/listings/stages';
import { feetToInches, inchesToFeet, normalizeInches } from '@/lib/listings/dimensions';
import { invalidateListingQueries } from '@/lib/listings/liveSync';
import type { Tables } from '@/integrations/supabase/types';
import type { ListingCategory } from '@/types/listing';

type Listing = Tables<'listings'>;

/**
 * Only published for-sale listings in the categories the current publish rule
 * covers, and only while a required measurement is missing or invalid.
 */
export const needsDimensionBackfill = (listing: Pick<
  Listing,
  'status' | 'mode' | 'category' | 'length_inches' | 'height_inches'
>): boolean => {
  if (listing.status !== 'published') return false;
  if (!requiresSaleDimensions(listing.mode as 'rent' | 'sale', listing.category as ListingCategory)) {
    return false;
  }
  return !normalizeInches(listing.length_inches) || !normalizeInches(listing.height_inches);
};

interface Props {
  listing: Listing;
}

export const ListingDimensionsPrompt = ({ listing }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Locally tracked values so the card reflects the save immediately without
  // waiting on the dashboard's fetch.
  const [saved, setSaved] = useState({
    length: listing.length_inches,
    width: listing.width_inches,
    height: listing.height_inches,
  });
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lengthFt, setLengthFt] = useState(() => inchesToFeet(listing.length_inches));
  const [widthFt, setWidthFt] = useState(() => inchesToFeet(listing.width_inches));
  const [heightFt, setHeightFt] = useState(() => inchesToFeet(listing.height_inches));

  const incomplete = useMemo(
    () =>
      needsDimensionBackfill({
        status: listing.status,
        mode: listing.mode,
        category: listing.category,
        length_inches: saved.length,
        height_inches: saved.height,
      }),
    [listing.status, listing.mode, listing.category, saved.length, saved.height],
  );

  if (!incomplete) return null;

  const lengthInches = feetToInches(lengthFt);
  const heightInches = feetToInches(heightFt);
  const widthInches = widthFt.trim() ? feetToInches(widthFt) : null;
  const widthInvalid = widthFt.trim().length > 0 && !widthInches;
  const canSave = !!lengthInches && !!heightInches && !widthInvalid;

  const handleOpen = (next: boolean) => {
    if (next) {
      setLengthFt(inchesToFeet(saved.length));
      setWidthFt(inchesToFeet(saved.width));
      setHeightFt(inchesToFeet(saved.height));
    }
    setOpen(next);
  };

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          length_inches: lengthInches,
          height_inches: heightInches,
          width_inches: widthInches,
        })
        .eq('id', listing.id);
      if (error) throw error;

      setSaved({ length: lengthInches, width: widthInches, height: heightInches });
      invalidateListingQueries(queryClient);
      setOpen(false);
      toast({
        title: 'Specs updated',
        description: 'Your dimensions are now live on the listing.',
      });
    } catch (err) {
      console.error('Failed to save listing dimensions', err);
      toast({
        title: 'Could not save dimensions',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-amber-500/[0.07] px-3 py-2.5 ring-1 ring-inset ring-amber-500/25">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300">
          <Ruler className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Specs incomplete
        </span>
        <p className="min-w-[12rem] flex-1 text-xs text-muted-foreground">
          Add dimensions to help buyers evaluate fit, transport, and delivery.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg border-amber-500/40 bg-amber-500/10 px-3 text-xs text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
          onClick={() => handleOpen(true)}
        >
          Add dimensions
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Complete your listing specs</DialogTitle>
            <DialogDescription>
              Add dimensions to help buyers evaluate fit, transport, and delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`length-ft-${listing.id}`}>Length (ft)</Label>
              <Input
                id={`length-ft-${listing.id}`}
                inputMode="decimal"
                placeholder="24"
                value={lengthFt}
                onChange={(e) => setLengthFt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`height-ft-${listing.id}`}>Height (ft)</Label>
              <Input
                id={`height-ft-${listing.id}`}
                inputMode="decimal"
                placeholder="11"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`width-ft-${listing.id}`}>
                Width (ft) <span className="text-muted-foreground">· optional</span>
              </Label>
              <Input
                id={`width-ft-${listing.id}`}
                inputMode="decimal"
                placeholder="8.5"
                value={widthFt}
                onChange={(e) => setWidthFt(e.target.value)}
              />
            </div>
          </div>

          {(!canSave || widthInvalid) && (
            <p className="text-xs text-muted-foreground">
              Length and height are required and must be greater than zero.
            </p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Save dimensions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ListingDimensionsPrompt;
