import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HostEvent } from '@/hooks/useHostEvents';

interface StorefrontEventsSectionProps {
  events: HostEvent[];
  isLoading: boolean;
}

const StorefrontEventsSection = ({ events, isLoading }: StorefrontEventsSectionProps) => {
  // Filter to upcoming events only
  const upcomingEvents = events.filter(event => {
    if (!event.event_date) return event.is_recurring; // Recurring events without dates show
    const eventDate = parseISO(event.event_date);
    return isAfter(eventDate, new Date()) || isSameDay(eventDate, new Date());
  });

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="h-6 w-40 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (upcomingEvents.length === 0) {
    return null; // Don't show section if no events
  }

  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case 'festival':
        return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300';
      case 'popup':
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300';
      case 'special':
        return 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300';
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative"
    >
      <div className="glass-premium rounded-2xl p-6 border border-border/50 relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Upcoming Events</h3>
              <p className="text-sm text-muted-foreground">Special happenings & announcements</p>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingEvents.slice(0, 4).map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={cn(
                "group relative rounded-xl p-4 border transition-all duration-300",
                "bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm",
                "hover:shadow-lg hover:border-primary/30 hover:scale-[1.02]",
                "border-border/50"
              )}
            >
              {/* Event Image or Gradient Background */}
              {event.image_url ? (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <img 
                    src={event.image_url} 
                    alt={event.title}
                    className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <div className={cn(
                    "absolute inset-0 opacity-30",
                    getEventTypeStyle(event.event_type)
                  )} />
                </div>
              )}

              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs font-medium capitalize border",
                      getEventTypeStyle(event.event_type)
                    )}
                  >
                    {event.event_type}
                  </Badge>
                  {event.is_recurring && (
                    <Badge variant="secondary" className="text-xs">
                      Recurring
                    </Badge>
                  )}
                </div>

                <h4 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {event.title}
                </h4>

                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {event.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {event.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(parseISO(event.event_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {event.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {event.start_time.slice(0, 5)}
                      {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                    </span>
                  )}
                </div>

                {event.listing_title && (
                  <Link 
                    to={`/listing/${event.listing_id}`}
                    className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {event.listing_title}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {upcomingEvents.length > 4 && (
          <div className="relative mt-4 text-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all {upcomingEvents.length} events
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default StorefrontEventsSection;
