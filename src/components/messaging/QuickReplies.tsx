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
    <div
      role="group"
      aria-label="Suggested replies"
      className="flex gap-2 overflow-x-auto border-t border-[#ECE6DD] px-4 py-2.5 [scrollbar-width:none] sm:flex-wrap sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {replies.map((reply) => (
        <Button
          key={reply}
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-full border-[#E2DBD0] bg-white px-3 text-[12.5px] font-medium text-[#1C1B1A] hover:border-[#1C1B1A] hover:bg-white hover:text-[#1C1B1A]"
          onClick={() => onSelect(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  );
};

export default QuickReplies;
