import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Calendar, Heart, MessageSquare, MapPin} from 'lucide-react';
import { cn } from '@/lib/utils';

type Event = {
  id: string;
  type: 'booking' | 'view' | 'favorite' | 'inquiry';
  message: string;
  city: string;
  ts: number;
  synthetic: boolean;
};

const FIRST_NAMES = ['Sarah', 'Mike', 'Jasmine', 'Carlos', 'Aisha', 'Tyler', 'Priya', 'Marcus', 'Elena', 'Ben', 'Nia', 'Diego', 'Maya', 'Sam', 'Rachel'];
const ICONS = { booking: Calendar, view: Eye, favorite: Heart, inquiry: MessageSquare } as const;
const COLORS = {
  booking: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  view: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  favorite: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  inquiry: 'text-amber-400 bg-amber-500/10 border-amber-500/20'};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Live activity feed: blends recent real bookings + listing views + favorites with
 * plausible synthetic events to maintain perceived activity. Shows a single rotating
 * pill in the bottom-left of the viewport.
 */
export const LiveActivityFeed = () => {
  const { pathname } = useLocation();
  // Only show on listing detail pages — keeps homepage/chat-widget areas clear.
  const allowed = /^\/(listing|listings)\//.test(pathname);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [hidden, setHidden] = useState(false);

  // Build event pool: real recent + synthetic from real listings
  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      const since24h = new Date(Date.now() - 86400000).toISOString();
      const [{ data: bookings }, { data: views }, { data: favs }, { data: listings }] = await Promise.all([
        supabase.from('booking_requests').select('id, listing_id, created_at, listings(title, city)').gte('created_at', since24h).limit(15),
        supabase.from('listing_views').select('listing_id, viewed_at, listings(title, city)').gte('viewed_at', since24h).limit(20),
        supabase.from('favorites').select('listing_id, created_at, listings(title, city)').gte('created_at', since24h).limit(10),
        supabase.from('listings').select('title, city').eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear').not('city', 'is', null).limit(40)]);
      if (cancelled) return;

      const real: Event[] = [];
      (bookings || []).forEach((b: any) => {
        if (!b.listings?.title) return;
        real.push({
          id: `b-${b.id}`,
          type: 'booking',
          message: `${pick(FIRST_NAMES)} booked ${b.listings.title}`,
          city: b.listings.city || 'somewhere',
          ts: new Date(b.created_at).getTime(),
          synthetic: false});
      });
      (views || []).forEach((v: any, i: number) => {
        if (!v.listings?.title) return;
        real.push({
          id: `v-${i}-${v.listing_id}`,
          type: 'view',
          message: `${pick(FIRST_NAMES)} is viewing ${v.listings.title}`,
          city: v.listings.city || 'somewhere',
          ts: new Date(v.viewed_at).getTime(),
          synthetic: false});
      });
      (favs || []).forEach((f: any, i: number) => {
        if (!f.listings?.title) return;
        real.push({
          id: `f-${i}-${f.listing_id}`,
          type: 'favorite',
          message: `${pick(FIRST_NAMES)} saved ${f.listings.title}`,
          city: f.listings.city || 'somewhere',
          ts: new Date(f.created_at).getTime(),
          synthetic: false});
      });

      // Synthetic events from real listings to keep feed lively
      const synthetic: Event[] = [];
      const listingPool = listings || [];
      if (listingPool.length > 0) {
        const n = Math.max(8, 20 - real.length);
        for (let i = 0; i < n; i++) {
          const l: any = pick(listingPool);
          if (!l?.title) continue;
          const type = pick<Event['type']>(['view', 'view', 'favorite', 'inquiry', 'booking']);
          const messages: Record<Event['type'], string> = {
            booking: `${pick(FIRST_NAMES)} just booked ${l.title}`,
            view: `${Math.floor(Math.random() * 4) + 2} people are viewing ${l.title}`,
            favorite: `${pick(FIRST_NAMES)} saved ${l.title}`,
            inquiry: `${pick(FIRST_NAMES)} inquired about ${l.title}`};
          synthetic.push({
            id: `s-${i}-${Date.now()}`,
            type,
            message: messages[type],
            city: l.city,
            ts: Date.now() - Math.floor(Math.random() * 3600000),
            synthetic: true});
        }
      }

      const merged = [...real, ...synthetic].sort((a, b) => b.ts - a.ts);
      if (merged.length > 0) setEvents(merged);
    };
    build();
    return () => { cancelled = true; };
  }, []);

  // Rotate active event every 7.5s with fade
  useEffect(() => {
    if (events.length === 0) return;
    const tick = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIdx((i) => (i + 1) % events.length);
        setVisible(true);
      }, 400);
    }, 7500);
    return () => clearInterval(tick);
  }, [events.length]);

  const current = events[activeIdx];
  const Icon = current ? ICONS[current.type] : null;
  const colorClass = current ? COLORS[current.type] : '';

  const timeAgo = useMemo(() => {
    if (!current) return '';
    const diffMin = Math.max(1, Math.floor((Date.now() - current.ts) / 60000));
    if (diffMin < 60) return `${diffMin}m ago`;
    const h = Math.floor(diffMin / 60);
    return `${h}h ago`;
  }, [current]);

  if (!allowed || !current || hidden) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-40 max-w-[calc(100vw-2rem)] sm:max-w-[320px]",
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full bg-card border-2 border-white/[0.10] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]" style={{ transform: 'translateZ(0)' }}>
        <div className={cn("relative w-7 h-7 rounded-full flex items-center justify-center border-2", colorClass)}>
          <Icon className="h-3 w-3" strokeWidth={2.25} />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-[1.5px] ring-background animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground/90 truncate leading-tight">{current.message}</p>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 mt-0.5">
            <MapPin className="h-2 w-2" />
            <span className="truncate">{current.city}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{timeAgo}</span>
          </div>
        </div>
        <button
          onClick={() => setHidden(true)}
          className="text-muted-foreground/50 hover:text-foreground/80 text-sm leading-none w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};
