import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';

interface BlockDatesModalProps {
  open: boolean;
  onClose: () => void;
  selectedDates: Date[];
  onBlock: (dates: Date[], note?: string) => Promise<void>;
}

const BlockDatesModal = ({ 
  open, 
  onClose, 
  selectedDates, 
  onBlock 
}: BlockDatesModalProps) => {
  const [note, setNote] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (selectedDates.length === 0) return;
    
    setIsBlocking(true);
    try {
      await onBlock(selectedDates, note || undefined);
      setNote('');
    } finally {
      setIsBlocking(false);
    }
  };

  const formatDateRange = () => {
    if (selectedDates.length === 0) return 'No dates selected';
    if (selectedDates.length === 1) {
      return selectedDates[0].toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    
    const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${selectedDates.length} days)`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Block dates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Mark days you're unavailable — they won't be bookable.
          </p>

          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm font-medium text-foreground">
              {formatDateRange()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Add a note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Maintenance, private use, special event…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isBlocking}>
            Cancel
          </Button>
          <Button 
            variant="dark-shine" 
            onClick={handleBlock}
            disabled={isBlocking || selectedDates.length === 0}
          >
            {isBlocking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Blocking...
              </>
            ) : (
              'Save blocked dates'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockDatesModal;
