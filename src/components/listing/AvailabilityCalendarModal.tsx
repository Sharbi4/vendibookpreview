import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvailabilityCalendarDisplay } from '@/components/listing-detail/AvailabilityCalendarDisplay';

interface AvailabilityCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  availableFrom?: string | null;
  availableTo?: string | null;
}

export const AvailabilityCalendarModal: React.FC<AvailabilityCalendarModalProps> = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  availableFrom,
  availableTo,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg line-clamp-1">{listingTitle}</DialogTitle>
        </DialogHeader>
        <AvailabilityCalendarDisplay
          listingId={listingId}
          availableFrom={availableFrom}
          availableTo={availableTo}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AvailabilityCalendarModal;
