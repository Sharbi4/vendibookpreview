import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
  const { user } = useAuth();
  
  // Determine other party
  const isHost = user?.id === conversation.host_id;
  const otherParty = isHost ? conversation.shopper : conversation.host;
  const otherPartyName = otherParty?.full_name || 'Unknown User';
  const otherPartyAvatar = otherParty?.avatar_url;

  const lastMessageTime = conversation.last_message?.created_at
    ? formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })
    : null;

  const isOwnMessage = conversation.last_message?.sender_id === user?.id;
  const messagePreview = conversation.last_message?.message
    ? (isOwnMessage ? 'You: ' : '') + conversation.last_message.message
    : 'No messages yet';

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className={cn(
        'flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors border-b border-border',
        conversation.unread_count && conversation.unread_count > 0 && 'bg-primary/5'
      )}
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={otherPartyAvatar || undefined} alt={otherPartyName} />
        <AvatarFallback>
          {otherPartyName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className={cn(
            'font-medium text-foreground truncate',
            conversation.unread_count && conversation.unread_count > 0 && 'font-semibold'
          )}>
            {otherPartyName}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lastMessageTime && (
              <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
            )}
            {conversation.unread_count && conversation.unread_count > 0 && (
              <Badge className="h-5 min-w-5 flex items-center justify-center text-xs rounded-full">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>

        {conversation.listing && (
          <p className="text-xs text-primary mb-1 truncate">
            {conversation.listing.title}
          </p>
        )}

        <p className={cn(
          'text-sm truncate',
          conversation.unread_count && conversation.unread_count > 0 
            ? 'text-foreground' 
            : 'text-muted-foreground'
        )}>
          {messagePreview}
        </p>
      </div>
    </Link>
  );
};

const ConversationList = () => {
  const { conversations, isLoading } = useConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No conversations yet
        </h3>
        <p className="text-muted-foreground max-w-sm">
          When you message a host about a listing, your conversation will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conversation) => (
        <ConversationItem key={conversation.id} conversation={conversation} />
      ))}
    </div>
  );
};

export default ConversationList;
