import { Button } from '@/components/ui/button';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  isFirstMessage: boolean;
  isHost: boolean;
}

const SHOPPER_QUICK_REPLIES = [
  "What dates are available?",
  "Can I schedule a viewing?",
  "Is delivery available?",
  "What's included?",
];

const HOST_QUICK_REPLIES = [
  "Yes, it's available!",
  "Let me check and get back to you.",
  "What dates work for you?",
  "Thanks for your interest!",
];

const FOLLOW_UP_SHOPPER = [
  "Sounds great, thank you!",
  "Can we set up a time?",
  "What's the best price?",
];

const FOLLOW_UP_HOST = [
  "It's available for those dates!",
  "I can offer a discount for longer rentals.",
  "When would you like to pick up?",
];

const QuickReplies = ({ onSelect, isFirstMessage, isHost }: QuickRepliesProps) => {
  const replies = isFirstMessage
    ? (isHost ? HOST_QUICK_REPLIES : SHOPPER_QUICK_REPLIES)
    : (isHost ? FOLLOW_UP_HOST : FOLLOW_UP_SHOPPER);

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-border/50">
      {replies.map((reply) => (
        <Button
          key={reply}
          variant="outline"
          size="sm"
          className="h-7 text-xs rounded-full font-normal"
          onClick={() => onSelect(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  );
};

export default QuickReplies;
