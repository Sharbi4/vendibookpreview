import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ReactionSummary } from '@/hooks/useMessageReactions';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageReactionsProps {
  messageId: string;
  reactions: ReactionSummary[];
  isOwn: boolean;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

export const MessageReactionPicker = ({ 
  messageId, 
  onToggleReaction 
}: { 
  messageId: string; 
  onToggleReaction: (messageId: string, emoji: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Smile className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" side="top" align="center">
        <div className="flex items-center gap-0.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="text-lg hover:bg-muted rounded-md p-1.5 transition-colors cursor-pointer"
              onClick={() => {
                onToggleReaction(messageId, emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const MessageReactionBadges = ({ 
  messageId,
  reactions, 
  isOwn,
  onToggleReaction,
}: MessageReactionsProps) => {
  if (reactions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggleReaction(messageId, r.emoji)}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors cursor-pointer',
            r.hasReacted 
              ? 'bg-primary/10 border-primary/30 text-primary' 
              : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
};
