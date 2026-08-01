import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const useCountUp = (end: number, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || end === 0) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
};

const SocialProofStrip = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const [{ count: listingCount }, { count: bookingCount }] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear'),
        supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
      ]);
      // Get unique cities
      const { data: cities } = await supabase
        .from('listings')
        .select('city')
        .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
        .not('city', 'is', null);
      const uniqueCities = new Set(cities?.map(c => c.city).filter(Boolean)).size;
      
      return {
        listings: listingCount || 0,
        bookings: bookingCount || 0,
        cities: uniqueCities || 0,
      };
    },
    staleTime: 300000,
  });

  const listings = useCountUp(stats?.listings || 0, 1800, isInView);
  const bookings = useCountUp(stats?.bookings || 0, 1800, isInView);
  const cities = useCountUp(stats?.cities || 0, 1800, isInView);

  const items = [
    { value: listings, suffix: '+', label: 'Active Listings' },
    { value: bookings, suffix: '+', label: 'Bookings Made' },
    { value: cities, suffix: '', label: 'Cities Served' },
  ];

  return (
    <div ref={ref} className="border-y border-border/30 bg-card/80">
      <div className="container py-6">
        <div className="flex items-center justify-center gap-8 sm:gap-16 md:gap-24">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text-warm tabular-nums">
                {item.value}{item.suffix}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialProofStrip;
