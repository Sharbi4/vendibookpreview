import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageThread } from './MessageThread';

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  listingTitle: string;
  otherPartyName?: string;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
  open,
  onOpenChange,
  bookingId,
  listingTitle,
  otherPartyName,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-lg">
            Messages: {listingTitle}
          </DialogTitle>
          {otherPartyName && (
            <p className="text-sm text-muted-foreground">
              Conversation with {otherPartyName}
            </p>
          )}
        </DialogHeader>
        <MessageThread bookingId={bookingId} otherPartyName={otherPartyName} />
      </DialogContent>
    </Dialog>
  );
};
