import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';

interface MessageHostButtonProps {
  listingId: string;
  hostId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  fullWidth?: boolean;
}

const MessageHostButton = ({
  listingId,
  hostId,
  variant = 'outline',
  size = 'default',
  className = '',
  fullWidth = false,
}: MessageHostButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreateConversation } = useConversations();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    // If not logged in, redirect to auth
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to message the host.',
      });
      navigate('/auth', { state: { from: `/listing/${listingId}` } });
      return;
    }

    // Don't allow messaging yourself
    if (user.id === hostId) {
      toast({
        title: 'Cannot message yourself',
        description: "This is your own listing.",
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const conversationId = await getOrCreateConversation(listingId, hostId);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4 mr-2" />
      )}
      Message Host
    </Button>
  );
};

export default MessageHostButton;
