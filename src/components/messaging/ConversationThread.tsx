import ThreadListingCard from '@/components/workspace/inbox/ThreadListingCard';
import UnavailableConversation from './UnavailableConversation';
import MessagingSafety from './MessagingSafety';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertTriangle,
  ShieldAlert,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  CheckCheck,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMessages, ConversationMessage } from '@/hooks/useConversationMessages';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { detectPII } from '@/lib/piiDetection';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import TypingIndicator from './TypingIndicator';
import QuickReplies from './QuickReplies';
import { MessageReactionPicker, MessageReactionBadges } from './MessageReactions';
import type { ReactionSummary } from '@/hooks/useMessageReactions';
import { getCounterpartyName } from '@/lib/displayName';
import WalkthroughCta from '@/components/video/WalkthroughCta';
import MeetupRequestButton from './MeetupRequestButton';

interface ConversationThreadProps {
  conversationId: string;
  /** Short one-strip safety notice (dashboard inbox). Defaults to the full notice. */
  compactSafety?: boolean;
  /** Pin the listing (photo, price, next steps) under the header. Dashboard inbox only. */
  listingCard?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentPreview = ({ message, isOwn }: { message: ConversationMessage; isOwn: boolean }) => {
  if (!message.attachment_url) return null;
  
  const isImage = message.attachment_type?.startsWith('image/');
  
  return (
    <div className={cn(
      'mt-2 rounded-lg overflow-hidden border',
      isOwn ? 'border-primary-foreground/20' : 'border-border'
    )}>
      {isImage ? (
        <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
          <img 
            src={message.attachment_url} 
            alt={message.attachment_name || 'Image'} 
            className="max-w-[200px] max-h-[200px] object-cover"
          />
        </a>
      ) : (
        <a 
          href={message.attachment_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 p-2',
            isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-muted hover:bg-muted/80'
          )}
        >
          <FileText className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.attachment_name}</p>
            {message.attachment_size && (
              <p className={cn('text-xs', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {formatFileSize(message.attachment_size)}
              </p>
            )}
          </div>
          <Download className="h-4 w-4 flex-shrink-0" />
        </a>
      )}
    </div>
  );
};

const ReadReceipt = ({ message, isOwn, isLastOwnMessage }: { 
  message: ConversationMessage; 
  isOwn: boolean;
  isLastOwnMessage: boolean;
}) => {
  if (!isOwn) return null;
  
  // Only show detailed receipt on the last own message
  if (!isLastOwnMessage) return null;

  if (message.read_at) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        <CheckCheck className="h-3 w-3 text-primary" />
        Seen {formatDistanceToNow(new Date(message.read_at), { addSuffix: true })}
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
      <Check className="h-3 w-3" />
      Sent
    </span>
  );
};

const MessageBubble = ({ 
  message, 
  isOwn, 
  senderName,
  senderAvatar,
  isLastOwnMessage,
  reactions,
  onToggleReaction,
}: { 
  message: ConversationMessage; 
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string | null;
  isLastOwnMessage: boolean;
  reactions: ReactionSummary[];
  onToggleReaction: (messageId: string, emoji: string) => void;
}) => {
  const hasTextContent = message.message && message.message !== 'Sent an attachment';
  
  return (
    <div className={cn('group mb-3 flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && (
        <Avatar className="mt-0.5 h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderAvatar || undefined} alt={senderName} />
          <AvatarFallback className="bg-[#EFE9E1] text-xs font-semibold text-[#5E5953]">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('max-w-[80%] sm:max-w-[72%]', isOwn && 'text-right')}>
        <div className="relative">
          <div className={cn('flex items-center gap-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
            <div
              className={cn(
                'message-bubble inline-block rounded-[18px] px-3.5 py-2.5 text-left',
                isOwn 
                  ? 'is-own rounded-br-sm' 
                  : 'rounded-bl-sm'
              )}
            >
              {hasTextContent && (
                <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">{message.message}</p>
              )}
              <AttachmentPreview message={message} isOwn={isOwn} />
            </div>
            {!message.id.startsWith('temp-') && (
              <MessageReactionPicker 
                messageId={message.id} 
                onToggleReaction={onToggleReaction} 
              />
            )}
          </div>
          <MessageReactionBadges
            messageId={message.id}
            reactions={reactions}
            isOwn={isOwn}
            onToggleReaction={onToggleReaction}
          />
        </div>
        <div className={cn('mt-1 flex items-center gap-2 px-1', isOwn ? 'justify-end' : 'justify-start')}>
          <p className="text-[11.5px] tabular-nums text-muted-foreground" title={format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}>
            {format(new Date(message.created_at), 'h:mm a')}
          </p>
          <ReadReceipt message={message} isOwn={isOwn} isLastOwnMessage={isLastOwnMessage} />
        </div>
      </div>
    </div>
  );
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ConversationThread = ({ conversationId, compactSafety = false, listingCard = false }: ConversationThreadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const { toggleReaction, getReactionSummary } = useMessageReactions(conversationId);
  const { isOtherTyping, broadcastTyping, stopTyping } = useTypingIndicator(conversationId);

  const [inputValue, setInputValue] = useState('');
  const [piiError, setPiiError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHost = user?.id === conversation?.host_id;
  const hasMessages = messages.length > 0;
  const isFirstMessage = !hasMessages || messages.every(m => m.sender_id === (isHost ? conversation?.shopper_id : conversation?.host_id));

  // Find last own message for read receipt display
  const lastOwnMessageId = [...messages].reverse().find(m => m.sender_id === user?.id)?.id;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

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

  // Cleanup attachment preview URL
  useEffect(() => {
    return () => {
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
    };
  }, [attachment]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setSendError(null);
    broadcastTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Please upload an image, PDF, Word, Excel, or text file.', variant: 'destructive' });
      return;
    }

    setAttachment({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = () => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  };

  const handleSend = async () => {
    if (isSending || (!inputValue.trim() && !attachment) || piiError) return;

    stopTyping();
    setSendError(null);

    const attachmentData = attachment ? {
      file: attachment.file,
      url: attachment.preview,
      name: attachment.file.name,
      type: attachment.file.type,
      size: attachment.file.size,
    } : undefined;

    const result = await sendMessage(inputValue.trim(), attachmentData);
    if (result.success) {
      setInputValue('');
      setPiiError(null);
      removeAttachment();
    } else if (result.error) {
      setSendError(result.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (text: string) => {
    setInputValue(text);
    textareaRef.current?.focus();
  };

  if (!isLoading && !isAuthorized) return <UnavailableConversation conversationId={conversationId} />;

  if (isLoading) {
    return (
      <div className="message-thread flex h-full items-center justify-center" role="status" aria-label="Loading conversation">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const otherPartyName = getCounterpartyName(otherParty, 'Vendibook member');

  return (
    <div className="message-thread flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#ECE6DD] bg-background px-3 py-3 sm:px-5">
        <Button variant="ghost" size="icon" asChild className="-ml-1 h-10 w-10 shrink-0 rounded-full md:hidden">
          <Link to="/dashboard/messages" aria-label="Back to all conversations">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={otherParty?.avatar_url || undefined} alt={otherPartyName} />
          <AvatarFallback className="bg-[#EFE9E1] text-[13px] font-semibold text-[#5E5953]">{otherPartyName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-5 text-foreground">{otherPartyName}</h2>
          {conversation?.listing && (
            conversation.listing_id ? (
              <Link
                to={`/listing/${conversation.listing_id}`}
                className="block truncate text-[12.5px] leading-5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {conversation.listing.title}
              </Link>
            ) : (
              <p className="truncate text-[12.5px] leading-5 text-muted-foreground">{conversation.listing.title}</p>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isHost && (
            <MeetupRequestButton
              compact
              disabled={isSending}
              onSubmit={async (text) => {
                const result = await sendMessage(text);
                return result;
              }}
            />
          )}
          <WalkthroughCta listingId={conversation?.listing_id} conversationId={conversationId} compact />
        </div>
      </div>

      {listingCard && conversation?.listing_id && (
        <ThreadListingCard listingId={conversation.listing_id} isHost={isHost} />
      )}

      <MessagingSafety kind="conversation" thread={conversationId} compact={compactSafety} />

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <p className="text-[14px] font-semibold text-foreground">No messages yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Start your conversation with {otherPartyName}.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
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
                    <div className="my-5 flex items-center gap-3" role="separator" aria-label={currentDate}>
                      <span className="h-px flex-1 bg-[#ECE6DD]" aria-hidden="true" />
                      <span className="text-[11.5px] font-semibold tracking-[0.02em] text-muted-foreground">
                        {format(new Date(message.created_at), 'EEE, MMM d')}
                      </span>
                      <span className="h-px flex-1 bg-[#ECE6DD]" aria-hidden="true" />
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    senderName={isOwn ? 'You' : otherPartyName}
                    senderAvatar={isOwn ? undefined : otherParty?.avatar_url}
                    isLastOwnMessage={message.id === lastOwnMessageId}
                    reactions={getReactionSummary(message.id)}
                    onToggleReaction={toggleReaction}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Typing Indicator */}
        {isOtherTyping && <TypingIndicator name={otherPartyName} />}
      </div>

      {/* PII Warning */}
      {(piiError || sendError) && (
        <Alert variant="destructive" className="mx-4 mb-2 w-auto sm:mx-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{piiError || sendError}</AlertDescription>
        </Alert>
      )}

      {/* Quick Replies */}
      {conversation && (
        <QuickReplies 
          onSelect={handleQuickReply} 
          isFirstMessage={isFirstMessage} 
          isHost={isHost} 
        />
      )}

      {/* Attachment Preview */}
      {attachment && (
        <div className="mx-4 mb-2 rounded-xl border border-[#ECE6DD] bg-muted p-2 sm:mx-6">
          <div className="flex items-center gap-3">
            {attachment.preview ? (
              <img 
                src={attachment.preview} 
                alt="Preview" 
                className="h-12 w-12 object-cover rounded-lg"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0 rounded-full"
              onClick={removeAttachment}
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#ECE6DD] bg-background px-3 py-3 sm:px-5">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 flex-shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            aria-label="Attach a photo or file"
            title="Attach a photo or file (10 MB max)"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherPartyName}…`}
            aria-label={`Message ${otherPartyName}`}
            className="message-composer min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && !attachment) || isSending || !!piiError}
            size="icon"
            className="message-send h-11 w-11 flex-shrink-0 !rounded-full"
            aria-label="Send message"
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

export default function ConversationThreadView(props: ConversationThreadProps) {
  return <ConversationThread key={props.conversationId} {...props} />;
}
