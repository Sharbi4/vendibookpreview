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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Events & Updates</h2>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingEvent(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground animate-pulse">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No upcoming events or announcements</p>
            {canManage && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingEvent(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => {
            const Icon = eventTypeIcons[event.event_type] || CalendarDays;
            const badgeInfo = eventTypeBadges[event.event_type] || eventTypeBadges.event;

            return (
              <Card
                key={event.id}
                className={cn(
                  "overflow-hidden transition-shadow hover:shadow-md",
                  event.event_type === 'announcement' && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={badgeInfo.variant} className="text-xs">
                            {badgeInfo.label}
                          </Badge>
                          {event.is_recurring && (
                            <Badge variant="outline" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-foreground truncate">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {event.description}
                          </p>
                        )}
                        {event.event_date && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>{format(new Date(event.event_date), 'EEE, MMM d, yyyy')}</span>
                            {event.start_time && (
                              <>
                                <Clock className="h-3 w-3 ml-2" />
                                <span>
                                  {event.start_time.slice(0, 5)}
                                  {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                </span>
                              </>
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
                          className="h-8 w-8"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
