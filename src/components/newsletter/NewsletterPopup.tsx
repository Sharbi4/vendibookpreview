import { useState, useEffect } from 'react';
import { X, Mail, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has already seen/dismissed the popup
    const hasSeenPopup = localStorage.getItem('newsletter_popup_dismissed');
    const hasSubscribed = localStorage.getItem('newsletter_subscribed');
    
    if (!hasSeenPopup && !hasSubscribed) {
      // Show popup after 5 seconds
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('newsletter_popup_dismissed', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email, source: 'popup' });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already subscribed',
            description: 'This email is already on our newsletter list!',
          });
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        localStorage.setItem('newsletter_subscribed', 'true');
        
        // Send admin notification (fire and forget)
        supabase.functions.invoke('send-admin-notification', {
          body: { type: 'newsletter_signup', data: { email, source: 'popup' } }
        }).catch(err => console.error('Admin notification error:', err));

        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Newsletter signup error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Close popup"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="p-8">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">You're subscribed!</h3>
              <p className="text-muted-foreground">
                Thanks for joining. We'll keep you updated on the latest listings and deals.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                  <Mail className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Stay in the loop
                </h3>
                <p className="text-muted-foreground">
                  Get exclusive deals, new listings, and mobile food business tips delivered to your inbox.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-yellow-400 via-vendibook-orange to-orange-500 hover:from-yellow-500 hover:via-orange-500 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-4">
                No spam, unsubscribe anytime. By subscribing you agree to our{' '}
                <a href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </a>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsletterPopup;
