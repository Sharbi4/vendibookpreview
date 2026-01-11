import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertTriangle,
  ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMessages, ConversationMessage } from '@/hooks/useConversationMessages';
import { detectPII } from '@/lib/piiDetection';
import { cn } from '@/lib/utils';

interface ConversationThreadProps {
  conversationId: string;
}

const MessageBubble = ({ 
  message, 
  isOwn, 
  senderName,
  senderAvatar 
}: { 
  message: ConversationMessage; 
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string | null;
}) => {
  return (
    <div className={cn('flex gap-2 mb-4', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderAvatar || undefined} alt={senderName} />
          <AvatarFallback className="text-xs">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('max-w-[75%]', isOwn && 'text-right')}>
        <div
          className={cn(
            'px-4 py-2 rounded-2xl inline-block text-left',
            isOwn 
              ? 'bg-primary text-primary-foreground rounded-br-sm' 
              : 'bg-muted text-foreground rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 px-1">
          {format(new Date(message.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  );
};

const ConversationThread = ({ conversationId }: ConversationThreadProps) => {
  const { user } = useAuth();
  const {
    messages,
    conversation,
    otherParty,
    isLoading,
    isSending,
    isAuthorized,
    sendMessage,
    markAsRead,
  } = useConversationMessages(conversationId);

  const [inputValue, setInputValue] = useState('');
  const [piiError, setPiiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (isAuthorized && messages.length > 0) {
      markAsRead();
    }
  }, [isAuthorized, messages.length, markAsRead]);

  // Check for PII as user types
  useEffect(() => {
    if (inputValue) {
      const piiResult = detectPII(inputValue);
      if (piiResult.hasPII) {
        setPiiError("For safety, sharing phone numbers or email addresses isn't allowed. Please keep communication in Vendibook.");
      } else {
        setPiiError(null);
      }
    } else {
      setPiiError(null);
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || piiError) return;

    const result = await sendMessage(inputValue.trim());
    if (result.success) {
      setInputValue('');
      setPiiError(null);
    } else if (result.error) {
      setPiiError(result.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Not authorized
        </h3>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view this conversation.
        </p>
        <Button asChild variant="outline">
          <Link to="/messages">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to messages
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const otherPartyName = otherParty?.full_name || 'Unknown User';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={otherParty?.avatar_url || undefined} alt={otherPartyName} />
          <AvatarFallback>{otherPartyName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{otherPartyName}</h2>
          {conversation?.listing && (
            <p className="text-xs text-primary truncate">{conversation.listing.title}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-muted-foreground">
              Start your conversation with {otherPartyName}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Group messages by date */}
            {messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const currentDate = format(new Date(message.created_at), 'MMM d, yyyy');
              const prevDate = index > 0 
                ? format(new Date(messages[index - 1].created_at), 'MMM d, yyyy')
                : null;
              const showDateDivider = currentDate !== prevDate;

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {currentDate}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    senderName={isOwn ? 'You' : otherPartyName}
                    senderAvatar={isOwn ? undefined : otherParty?.avatar_url}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* PII Warning */}
      {piiError && (
        <Alert variant="destructive" className="mx-4 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{piiError}</AlertDescription>
        </Alert>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending || !!piiError}
            size="icon"
            className="flex-shrink-0 h-11 w-11"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConversationThread;
