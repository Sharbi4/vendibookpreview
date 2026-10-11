import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MEETUP_TIME_WINDOWS, formatMeetupRequest } from '@/lib/meetup';

interface MeetupRequestButtonProps {
  /** Sends the composed message into the conversation. */
  onSubmit: (message: string) => Promise<{ success: boolean; error?: string } | void>;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Lets a buyer ask the seller about the handoff before paying, without leaving
 * Vendibook messaging. The result is an ordinary conversation message.
 */
export default function MeetupRequestButton({ onSubmit, disabled, compact }: MeetupRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState(MEETUP_TIME_WINDOWS[0]);
  const [place, setPlace] = useState('');
  const [notes, setNotes] = useState('');

  const handleSend = async () => {
    setIsSending(true);
    setError(null);
    try {
      const result = await onSubmit(formatMeetupRequest({ date, timeWindow, place, notes }));
      if (result && result.success === false) {
        setError(result.error || 'We could not send that request. Please try again.');
        return;
      }
      setOpen(false);
      setDate('');
      setPlace('');
      setNotes('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={compact ? 'sm' : 'default'} disabled={disabled}>
          <CalendarClock className="h-4 w-4 sm:mr-2" />
          <span className={compact ? 'hidden sm:inline' : ''}>Request meetup</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask about the meetup</DialogTitle>
          <DialogDescription>
            Send the seller your preferred handoff time and area. Nothing is booked or paid by sending this.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meetup-date">Preferred date</Label>
            <Input id="meetup-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meetup-time">Preferred time</Label>
            <select
              id="meetup-time"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MEETUP_TIME_WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meetup-place">Suggested meeting area</Label>
            <Input
              id="meetup-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="A public, well-lit spot near the listing"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meetup-notes">Anything else?</Label>
            <Textarea
              id="meetup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What you'd like to inspect, who is coming with you, questions about access."
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Keep phone numbers and email addresses out of messages — coordinate here so the conversation stays on record.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !date}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
