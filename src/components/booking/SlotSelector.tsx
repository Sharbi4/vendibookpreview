import { useState, useEffect } from 'react';
import { MapPin, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SlotSelectorProps {
  listingId: string;
  totalSlots: number;
  slotNames: string[] | null;
  startDate: Date | undefined;
  endDate: Date | undefined;
  selectedSlot: number | null;
  selectedSlotName: string | null;
  onSlotSelect: (slotNumber: number, slotName: string) => void;
  disabled?: boolean;
}

interface BookedSlot {
  slot_number: number;
  slot_name: string | null;
}

export const SlotSelector = ({
  listingId,
  totalSlots,
  slotNames,
  startDate,
  endDate,
  selectedSlot,
  selectedSlotName,
  onSlotSelect,
  disabled = false,
}: SlotSelectorProps) => {
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch booked slots for the selected date range
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!startDate || !endDate) {
        setBookedSlots([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('booking_requests')
          .select('slot_number, slot_name')
          .eq('listing_id', listingId)
          .in('status', ['pending', 'approved'])
          .lte('start_date', format(endDate, 'yyyy-MM-dd'))
          .gte('end_date', format(startDate, 'yyyy-MM-dd'));

        if (error) throw error;

        setBookedSlots(
          (data || [])
            .filter((b): b is { slot_number: number; slot_name: string | null } => 
              b.slot_number !== null
            )
        );
      } catch (error) {
        console.error('Error fetching booked slots:', error);
        setBookedSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedSlots();
  }, [listingId, startDate, endDate]);

  // Generate slot options
  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const slotNumber = i + 1;
    const slotName = slotNames && slotNames[i] ? slotNames[i] : `Spot ${slotNumber}`;
    const isBooked = bookedSlots.some(b => b.slot_number === slotNumber);
    const isSelected = selectedSlot === slotNumber;

    return { slotNumber, slotName, isBooked, isSelected };
  });

  const availableCount = slots.filter(s => !s.isBooked).length;

  if (!startDate || !endDate) {
    return (
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">
          Select a Vendor Space
        </Label>
        <div className="p-4 bg-muted/30 rounded-xl border border-border text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Please select dates first to see available spaces
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Select a Vendor Space
        </Label>
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs font-medium px-2.5 py-1",
            availableCount > 0 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {availableCount} of {totalSlots} available
        </Badge>
      </div>

      {isLoading ? (
        <div className="glass-card p-4 rounded-xl border border-border/50 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Checking availability...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.slotNumber}
              type="button"
              onClick={() => {
                if (!slot.isBooked && !disabled) {
                  onSlotSelect(slot.slotNumber, slot.slotName);
                }
              }}
              disabled={slot.isBooked || disabled}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all duration-200 text-left group",
                slot.isBooked
                  ? "bg-muted/20 border-muted cursor-not-allowed opacity-50"
                  : slot.isSelected
                  ? "glass-premium border-primary shadow-md shadow-primary/10"
                  : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
              )}
            >
              {/* Selected glow effect */}
              {slot.isSelected && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              )}
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                      slot.isBooked
                        ? "bg-muted text-muted-foreground"
                        : slot.isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted group-hover:bg-primary/10 text-foreground group-hover:text-primary"
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium truncate max-w-[100px]",
                      slot.isBooked
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {slot.slotName}
                  </span>
                </div>
                {slot.isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
              {slot.isBooked && (
                <span className="relative z-10 text-[10px] text-destructive mt-1 block font-medium">
                  Booked
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedSlot && selectedSlotName && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Selected: <span className="font-medium text-foreground">{selectedSlotName}</span>
        </p>
      )}
    </div>
  );
};
