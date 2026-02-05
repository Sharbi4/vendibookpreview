import { useState, useEffect } from 'react';
import { CalendarDays, Sparkles, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface EventFormData {
  title: string;
  description: string;
  eventType: 'event' | 'update' | 'announcement';
  eventDate: Date | undefined;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrencePattern: string;
}

interface ListingEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventFormData) => void;
  isLoading?: boolean;
  editingEvent?: ListingEvent | null;
}

const eventTypes = [
  { value: 'event', label: 'Event', icon: CalendarDays, description: 'A scheduled event or gathering' },
  { value: 'update', label: 'Update', icon: Sparkles, description: 'News or changes about this location' },
  { value: 'announcement', label: 'Announcement', icon: Megaphone, description: 'Important notices for vendors' },
] as const;

export const EventFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  editingEvent,
}: EventFormDialogProps) => {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    eventType: 'event',
    eventDate: undefined,
    startTime: '',
    endTime: '',
    isRecurring: false,
    recurrencePattern: 'weekly',
  });

  // Reset or populate form when dialog opens/closes or editingEvent changes
  useEffect(() => {
    if (open && editingEvent) {
      setFormData({
        title: editingEvent.title,
        description: editingEvent.description || '',
        eventType: (editingEvent.event_type as 'event' | 'update' | 'announcement') || 'event',
        eventDate: editingEvent.event_date ? new Date(editingEvent.event_date) : undefined,
        startTime: editingEvent.start_time?.slice(0, 5) || '',
        endTime: editingEvent.end_time?.slice(0, 5) || '',
        isRecurring: editingEvent.is_recurring || false,
        recurrencePattern: editingEvent.recurrence_pattern || 'weekly',
      });
    } else if (!open) {
      setFormData({
        title: '',
        description: '',
        eventType: 'event',
        eventDate: undefined,
        startTime: '',
        endTime: '',
        isRecurring: false,
        recurrencePattern: 'weekly',
      });
    }
  }, [open, editingEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Event Type */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Type</Label>
            <RadioGroup
              value={formData.eventType}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, eventType: val as EventFormData['eventType'] }))
              }
              className="grid grid-cols-3 gap-2"
            >
              {eventTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.value}>
                    <RadioGroupItem
                      value={type.value}
                      id={type.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.value}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                        "hover:border-primary/50"
                      )}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-2 block">
              Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Weekend Food Festival"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium mb-2 block">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Tell vendors what to expect..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formData.eventDate
                    ? format(formData.eventDate, 'PPP')
                    : 'Select a date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={formData.eventDate}
                  onSelect={(date) => setFormData((prev) => ({ ...prev, eventDate: date }))}
                  className={cn("p-3 pointer-events-auto")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          {formData.eventDate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium mb-2 block">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium mb-2 block">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Recurring */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div>
              <Label htmlFor="recurring" className="text-sm font-medium">
                Recurring Event
              </Label>
              <p className="text-xs text-muted-foreground">
                This event repeats regularly
              </p>
            </div>
            <Switch
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isRecurring: checked }))
              }
            />
          </div>

          {formData.isRecurring && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Frequency</Label>
              <RadioGroup
                value={formData.recurrencePattern}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, recurrencePattern: val }))
                }
                className="flex gap-2"
              >
                {['weekly', 'biweekly', 'monthly'].map((pattern) => (
                  <div key={pattern} className="flex items-center space-x-2">
                    <RadioGroupItem value={pattern} id={pattern} />
                    <Label htmlFor={pattern} className="text-sm capitalize cursor-pointer">
                      {pattern}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !formData.title.trim()}>
              {isLoading ? 'Saving...' : editingEvent ? 'Save Changes' : 'Add Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
