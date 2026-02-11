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

interface ConversationThreadProps {
  conversationId: string;
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
    <div className={cn('flex gap-2 mb-4 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderAvatar || undefined} alt={senderName} />
          <AvatarFallback className="text-xs">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('max-w-[75%]', isOwn && 'text-right')}>
        <div className="relative">
          <div className={cn('flex items-center gap-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
            <div
              className={cn(
                'px-4 py-2 rounded-2xl inline-block text-left',
                isOwn 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-muted text-foreground rounded-bl-sm'
              )}
            >
              {hasTextContent && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
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
        <div className={cn('flex items-center gap-2 mt-1 px-1', isOwn ? 'justify-end' : 'justify-start')}>
          <p className="text-xs text-muted-foreground">
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

const ConversationThread = ({ conversationId }: ConversationThreadProps) => {
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
    if ((!inputValue.trim() && !attachment) || piiError) return;

    stopTyping();

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
      setPiiError(result.error);
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

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Not authorized</h3>
        <p className="text-muted-foreground mb-4">You don't have permission to view this conversation.</p>
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
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-muted-foreground">
              Start your conversation with {otherPartyName}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
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
      {piiError && (
        <Alert variant="destructive" className="mx-4 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{piiError}</AlertDescription>
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
        <div className="mx-4 mb-2 p-2 bg-muted rounded-lg border border-border">
          <div className="flex items-center gap-2">
            {attachment.preview ? (
              <img 
                src={attachment.preview} 
                alt="Preview" 
                className="h-12 w-12 object-cover rounded"
              />
            ) : (
              <div className="h-12 w-12 bg-primary/10 rounded flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={removeAttachment}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2">
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
            className="flex-shrink-0 h-11 w-11"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && !attachment) || isSending || !!piiError}
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
