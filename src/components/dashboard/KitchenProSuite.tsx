import { useMemo } from 'react';
import { ChefHat, Clock, Calendar as CalendarIcon, TrendingUp, Loader2, Wrench, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Kitchen Pro Suite — slot calendar, equipment scheduling, hourly utilization heatmap.
 * Surfaces conditionally for hosts who own ghost_kitchen listings.
 */
export const KitchenProSuite = () => {
  const { listings, isLoading } = useHostListings();
  const { bookings } = useHostBookings();

  const kitchens = useMemo(
    () => listings.filter((l) => l.category === 'ghost_kitchen' && l.status === 'published'),
    [listings]
  );

  // Build hourly utilization heatmap (day-of-week × hour) from confirmed bookings
  const heatmap = useMemo(() => {
    const grid: number[][] = DAYS.map(() => HOURS.map(() => 0));
    let max = 0;
    bookings.forEach((b: any) => {
      if (!['approved', 'confirmed', 'completed'].includes(b.status)) return;
      const slots = b.hourly_slots;
      if (Array.isArray(slots)) {
        slots.forEach((entry: any) => {
          const date = new Date(entry.date);
          const dow = date.getDay();
          (entry.slots || []).forEach((slot: string) => {
            const hour = parseInt(slot.split(':')[0], 10);
            if (!isNaN(hour)) {
              grid[dow][hour] += 1;
              if (grid[dow][hour] > max) max = grid[dow][hour];
            }
          });
        });
      } else if (b.start_date && b.end_date) {
        // daily booking — block all hours of those days
        const start = new Date(b.start_date);
        const end = new Date(b.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay();
          for (let h = 8; h < 22; h++) {
            grid[dow][h] += 1;
            if (grid[dow][h] > max) max = grid[dow][h];
          }
        }
      }
    });
    return { grid, max: max || 1 };
  }, [bookings]);

  // Slot utilization
  const slotStats = useMemo(() => {
    return kitchens.map((k) => {
      const total = k.total_slots || 1;
      const slotBookings = bookings.filter(
        (b: any) =>
          b.listing_id === k.id && ['approved', 'confirmed', 'completed'].includes(b.status)
      );
      const utilizationPct = Math.min(100, Math.round((slotBookings.length / (total * 30)) * 100));
      return {
        id: k.id,
        title: k.title,
        slotNames: k.slot_names || [],
        totalSlots: total,
        bookingsCount: slotBookings.length,
        utilizationPct,
      };
    });
  }, [kitchens, bookings]);

  const peakHours = useMemo(() => {
    const totals: { hour: number; count: number }[] = HOURS.map((h) => {
      const sum = DAYS.reduce((s, _, dow) => s + heatmap.grid[dow][h], 0);
      return { hour: h, count: sum };
    });
    return totals.sort((a, b) => b.count - a.count).slice(0, 3);
  }, [heatmap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (kitchens.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="py-12 text-center">
          <ChefHat className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground mb-1">Kitchen Pro tools</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Publish a ghost-kitchen listing to unlock slot calendars, equipment scheduling, and
            hourly utilization heatmaps.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border border-border bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Kitchen Pro Suite</h3>
              <p className="text-xs text-muted-foreground">
                Advanced operations for {kitchens.length} ghost kitchen
                {kitchens.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot Utilization */}
      <Card className="border border-border">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Slot utilization (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {slotStats.map((s) => (
            <div key={s.id} className="space-y-2 pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                <Badge variant="outline" className="text-[10px]">
                  {s.totalSlots} slot{s.totalSlots > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={s.utilizationPct} className="h-2 flex-1" />
                <span
                  className={cn(
                    'text-xs font-semibold w-12 text-right',
                    s.utilizationPct >= 70
                      ? 'text-emerald-600'
                      : s.utilizationPct >= 40
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  )}
                >
                  {s.utilizationPct}%
                </span>
              </div>
              {s.slotNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.slotNames.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {s.bookingsCount} booking{s.bookingsCount !== 1 ? 's' : ''} this period
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card className="border border-border">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Hourly demand heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex">
                <div className="w-10 shrink-0" />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="w-6 text-center text-[9px] text-muted-foreground font-medium"
                  >
                    {h % 6 === 0 ? h : ''}
                  </div>
                ))}
              </div>
              {DAYS.map((day, dow) => (
                <div key={day} className="flex items-center">
                  <div className="w-10 shrink-0 text-[10px] font-medium text-muted-foreground pr-2">
                    {day}
                  </div>
                  {HOURS.map((h) => {
                    const v = heatmap.grid[dow][h];
                    const intensity = v / heatmap.max;
                    return (
                      <div
                        key={h}
                        title={`${day} ${h}:00 — ${v} booking${v !== 1 ? 's' : ''}`}
                        className="w-6 h-6 m-px rounded-sm border border-border/50"
                        style={{
                          backgroundColor:
                            intensity === 0
                              ? 'hsl(var(--muted))'
                              : `hsl(160 70% ${Math.max(20, 65 - intensity * 45)}%)`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {peakHours[0]?.count > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border">
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                Peak hours
              </p>
              <p className="text-xs text-muted-foreground">
                {peakHours
                  .filter((p) => p.count > 0)
                  .map((p) => `${p.hour}:00 (${p.count})`)
                  .join(' · ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment scheduling placeholder */}
      <Card className="border border-border">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            Equipment scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['Convection oven', 'Walk-in cooler', 'Prep table', 'Dish station', 'Fryer', '6-burner range'].map(
              (eq) => (
                <div
                  key={eq}
                  className="p-3 rounded-xl border border-border bg-muted/20 text-center"
                >
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground truncate">{eq}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Available</p>
                </div>
              )
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Tap any item to block off equipment for maintenance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KitchenProSuite;
