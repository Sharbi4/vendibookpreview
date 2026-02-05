import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Sparkles, Megaphone, Edit, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EventFormDialog, type EventFormData } from './EventFormDialog';
import { cn } from '@/lib/utils';

interface ListingEvent {
  id: string;
  listing_id: string;
  host_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface ListingEventsSectionProps {
  listingId: string;
  hostId: string;
  isOwner?: boolean;
}

const eventTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  event: CalendarDays,
  update: Sparkles,
  announcement: Megaphone,
};

const eventTypeBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  event: { label: 'Event', variant: 'default' },
  update: { label: 'Update', variant: 'secondary' },
  announcement: { label: 'Announcement', variant: 'outline' },
};

export const ListingEventsSection = ({ listingId, hostId, isOwner = false }: ListingEventsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ListingEvent | null>(null);

  const canManage = isOwner || user?.id === hostId;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['listing-events', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_events')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_active', true)
        .order('event_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as ListingEvent[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: EventFormData) => {
      const { error } = await supabase.from('listing_events').insert({
        listing_id: listingId,
        host_id: hostId,
        title: formData.title,
        description: formData.description || null,
        event_type: formData.eventType,
        event_date: formData.eventDate ? format(formData.eventDate, 'yyyy-MM-dd') : null,
        start_time: formData.startTime || null,
        end_time: formData.endTime || null,
        is_recurring: formData.isRecurring,
        recurrence_pattern: formData.recurrencePattern || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-events', listingId] });
      toast({ title: 'Event created', description: 'Your event has been added.' });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create event.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: EventFormData }) => {
      const { error } = await supabase
        .from('listing_events')
        .update({
          title: formData.title,
          description: formData.description || null,
          event_type: formData.eventType,
          event_date: formData.eventDate ? format(formData.eventDate, 'yyyy-MM-dd') : null,
          start_time: formData.startTime || null,
          end_time: formData.endTime || null,
          is_recurring: formData.isRecurring,
          recurrence_pattern: formData.recurrencePattern || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-events', listingId] });
      toast({ title: 'Event updated', description: 'Your changes have been saved.' });
      setEditingEvent(null);
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update event.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('listing_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-events', listingId] });
      toast({ title: 'Event deleted', description: 'The event has been removed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete event.', variant: 'destructive' });
    },
  });

  const handleSubmit = (formData: EventFormData) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (event: ListingEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setEditingEvent(null);
    setIsDialogOpen(false);
  };

  // Don't render section if no events and not owner
  if (!canManage && events.length === 0) {
    return null;
  }

  return (
    <section className="py-8 border-t border-border">
      {/* Glass header card */}
      <div className="glass-premium rounded-2xl p-6 mb-6 border border-border/50 relative overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center icon-gradient-container">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Events & Updates</h2>
              <p className="text-sm text-muted-foreground">Stay in the loop with this venue</p>
            </div>
          </div>
          {canManage && (
            <Button
              variant="dark-shine"
              size="sm"
              onClick={() => {
                setEditingEvent(null);
                setIsDialogOpen(true);
              }}
              className="shadow-lg"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="glass-card rounded-xl p-8 inline-block">
            <p className="text-muted-foreground animate-pulse">Loading events...</p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent pointer-events-none" />
          <CardContent className="py-12 text-center relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No upcoming events or announcements</p>
            {canManage && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingEvent(null);
                  setIsDialogOpen(true);
                }}
                className="border-primary/30 hover:border-primary/50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Event
              </Button>
            )}
          </CardContent>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => {
            const Icon = eventTypeIcons[event.event_type] || CalendarDays;
            const badgeInfo = eventTypeBadges[event.event_type] || eventTypeBadges.event;

            return (
              <div
                key={event.id}
                className={cn(
                  "glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl border border-border/50 group relative",
                  event.event_type === 'announcement' && "border-primary/40"
                )}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                        event.event_type === 'announcement' 
                          ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                          : "bg-primary/10"
                      )}>
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={badgeInfo.variant} 
                            className={cn(
                              "text-xs font-medium",
                              event.event_type === 'announcement' && "bg-primary/10 text-primary border-primary/30"
                            )}
                          >
                            {badgeInfo.label}
                          </Badge>
                          {event.is_recurring && (
                            <Badge variant="outline" className="text-xs bg-accent/50">
                              Recurring
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {event.description}
                          </p>
                        )}
                        {event.event_date && (
                          <div className="flex items-center gap-1 mt-3 text-xs">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
                              <CalendarDays className="h-3 w-3 text-primary" />
                              <span className="text-foreground font-medium">
                                {format(new Date(event.event_date), 'EEE, MMM d')}
                              </span>
                            </div>
                            {event.start_time && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
                                <Clock className="h-3 w-3 text-primary" />
                                <span className="text-foreground font-medium">
                                  {event.start_time.slice(0, 5)}
                                  {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            );
          })}
        </div>
      )}

      <EventFormDialog
        open={isDialogOpen}
        onOpenChange={handleClose}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        editingEvent={editingEvent}
      />
    </section>
  );
};
