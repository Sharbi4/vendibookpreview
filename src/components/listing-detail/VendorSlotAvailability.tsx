import { useQuery } from '@tanstack/react-query';
import { MapPin, Users, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, startOfDay, addDays } from 'date-fns';

interface VendorSlotAvailabilityProps {
  listingId: string;
  totalSlots: number;
  slotNames: string[] | null;
}

interface BookedSlot {
  slot_number: number;
  slot_name: string | null;
  start_date: string;
  end_date: string;
  is_hourly_booking: boolean | null;
  hourly_slots: { date: string; slots: string[] }[] | null;
}

export const VendorSlotAvailability = ({
  listingId,
  totalSlots,
  slotNames,
}: VendorSlotAvailabilityProps) => {
  // Fetch current and upcoming bookings to show availability
  // Include PENDING bookings to block slots - prevents double-booking while awaiting approval/payment
  // Slots only become available again if booking is denied or cancelled
  const { data: bookedSlots = [], isLoading } = useQuery({
    queryKey: ['vendor-slot-availability', listingId],
    queryFn: async () => {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const nextMonth = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('booking_requests')
        .select('slot_number, slot_name, start_date, end_date, is_hourly_booking, hourly_slots')
        .eq('listing_id', listingId)
        .in('status', ['pending', 'approved', 'completed'])
        .lte('start_date', nextMonth)
        .gte('end_date', today);

      if (error) throw error;
      return (data || []).filter(
        (b): b is BookedSlot => b.slot_number !== null
      );
    },
  });

  // Check if a slot is available today
  // Supports both daily bookings and hourly bookings (with hourly_slots format)
  const isSlotAvailableToday = (slotNumber: number): boolean => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return !bookedSlots.some((b) => {
      if (b.slot_number !== slotNumber) return false;
      
      // For hourly bookings, check if any hours are booked today
      // hourly_slots is JSONB - ensure it's an array before accessing .length
      if (b.is_hourly_booking && Array.isArray(b.hourly_slots) && b.hourly_slots.length > 0) {
        const todaySlots = b.hourly_slots.find(s => s?.date === today);
        return todaySlots && Array.isArray(todaySlots.slots) && todaySlots.slots.length > 0;
      }
      
      // For daily bookings, check date range
      return b.start_date <= today && b.end_date >= today;
    });
  };

  // Generate slot data
  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const slotNumber = i + 1;
    const slotName = slotNames && slotNames[i] ? slotNames[i] : `Spot ${slotNumber}`;
    const isAvailable = isSlotAvailableToday(slotNumber);

    return { slotNumber, slotName, isAvailable };
  });

  const availableCount = slots.filter((s) => s.isAvailable).length;

  return (
    <div className="glass-premium rounded-2xl p-6 border border-border/50 relative overflow-hidden">
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Available Spaces</h3>
              <p className="text-sm text-muted-foreground">Select your spot</p>
            </div>
          </div>
          <Badge
            variant={availableCount > 0 ? 'default' : 'secondary'}
            className={cn(
              "text-sm font-medium px-3 py-1",
              availableCount > 0 
                ? "bg-primary/10 text-primary border-primary/30" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {availableCount} of {totalSlots} available today
          </Badge>
        </div>

        {/* Slot Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot) => (
              <div
                key={slot.slotNumber}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all duration-300",
                  slot.isAvailable
                    ? "bg-card border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                    : "bg-muted/30 border-muted/50 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        slot.isAvailable
                          ? "bg-primary/10"
                          : "bg-muted"
                      )}
                    >
                      <MapPin
                        className={cn(
                          "h-4 w-4",
                          slot.isAvailable
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium truncate max-w-[80px]",
                        slot.isAvailable
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      )}
                    >
                      {slot.slotName}
                    </span>
                  </div>
                  {slot.isAvailable ? (
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs mt-2 font-medium",
                    slot.isAvailable
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {slot.isAvailable ? "Available" : "Booked"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Select dates below to check specific availability
        </p>
      </div>
    </div>
  );
};
