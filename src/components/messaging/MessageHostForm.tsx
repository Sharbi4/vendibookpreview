import { sendMarketplaceMessage, messageSendError } from '@/lib/messageSafety';
import './messaging.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import { trackHostContacted, trackFormSubmit } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MessageHostFormProps {
  listingId: string;
  hostId: string;
  listingTitle?: string;
  className?: string;
}

const MessageHostForm = ({
  listingId,
  hostId,
  listingTitle,
  className = '',
}: MessageHostFormProps) => {
  const defaultMessage = listingTitle
    ? `Hi! I'd like to learn more about "${listingTitle}" and set up a time to see it.`
    : "Hi! I'd like to set up a time to see this.";

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreateConversation } = useConversations();
  const [message, setMessage] = useState(defaultMessage);
  const [isLoading, setIsLoading] = useState(false);
  // Guest (logged-out) inquiry: buyers can ask before creating an account.
  const [guest, setGuest] = useState({ name: '', email: '', phone: '' });
  const [guestSent, setGuestSent] = useState(false);

  const goToAuth = () => {
    sessionStorage.setItem('pendingMessage', JSON.stringify({
      listingId,
      hostId,
      message: message.trim(),
    }));
    navigate('/auth', { state: { from: `/listing/${listingId}`, pendingMessage: true } });
  };

  const handleGuestSend = async () => {
    const email = guest.email.trim();
    if (!EMAIL_RE.test(email)) {
      toast({ title: 'Add your email', description: 'We need an email so the seller can get back to you.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Client-generated id: anon users can insert leads but not read them back.
      const leadId = crypto.randomUUID();
      const { error } = await supabase.from('listing_leads').insert({
        id: leadId,
        listing_id: listingId,
        host_id: hostId,
        email,
        name: guest.name.trim() || null,
        phone: guest.phone.trim() || null,
        message: message.trim(),
        source: 'guest_inquiry',
      });
      if (error) throw error;

      // Notifications are best-effort; the lead is already saved.
      supabase.functions.invoke('notify-listing-lead', { body: { lead_id: leadId } })
        .catch((err) => console.error('notify-listing-lead failed', err));

      trackHostContacted(listingId);
      trackFormSubmit('guest_inquiry', true, { listing_id: listingId });
      setGuestSent(true);
    } catch (error) {
      console.error('Error sending guest inquiry:', error);
      trackFormSubmit('guest_inquiry', false, { listing_id: listingId, error: String(error) });
      toast({
        title: 'Something went wrong',
        description: 'Please try again, or sign in to message the seller.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    // Logged-out buyers send a guest inquiry instead of hitting a login wall.
    if (!user) {
      await handleGuestSend();
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
        // Send the message directly
        await sendMarketplaceMessage('conversation', conversationId, message.trim());

        // Update conversation last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        trackHostContacted(listingId);
        toast({
          title: 'Message sent!',
          description: 'The host has been notified.',
        });
        navigate(`/messages/${conversationId}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: messageSendError(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (guestSent) {
    return (
      <div className={`space-y-3 rounded-md border border-white/10 p-4 text-center ${className}`}>
        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
        <p className="font-semibold">Question sent</p>
        <p className="text-sm text-muted-foreground">
          We passed it to the seller. A Vendibook concierge will follow up at <strong>{guest.email.trim()}</strong> within 1 business hour.
        </p>
        <Button variant="link" className="h-auto p-0 text-sm" onClick={goToAuth}>
          Create a free account to chat with the seller directly
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a message to the host..."
        rows={4}
        className="message-composer min-h-[132px] max-h-[280px] resize-y text-base leading-relaxed border-[1.5px] border-white/10 rounded-md p-4 align-top focus-visible:ring-primary/30"
        disabled={isLoading}
      />
      {!user && (
        <div className="space-y-2">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Your email (required)"
            value={guest.email}
            onChange={(e) => setGuest({ ...guest, email: e.target.value })}
            disabled={isLoading}
            maxLength={320}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              autoComplete="name"
              placeholder="Name"
              value={guest.name}
              onChange={(e) => setGuest({ ...guest, name: e.target.value })}
              disabled={isLoading}
              maxLength={200}
            />
            <Input
              type="tel"
              autoComplete="tel"
              placeholder="Phone (optional)"
              value={guest.phone}
              onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
              disabled={isLoading}
              maxLength={40}
            />
          </div>
        </div>
      )}
      <Button
        onClick={handleSend}
        disabled={isLoading || !message.trim() || (!user && !guest.email.trim())}
        variant="cta"
        className="w-full h-12"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <Send className="h-5 w-5 mr-2" />
        )}
        {user ? 'Send Message' : 'Ask the Seller'}
      </Button>
      {!user && (
        <p className="text-xs text-center text-muted-foreground">
          No account needed. Vendibook keeps your contact info private and connects you with the seller.{' '}
          <button type="button" onClick={goToAuth} className="underline underline-offset-2">
            Sign in
          </button>{' '}
          to message directly.
        </p>
      )}
    </div>
  );
};

export default MessageHostForm;
