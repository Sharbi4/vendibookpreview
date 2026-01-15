import { useState } from 'react';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewsletterSectionProps {
  variant?: 'default' | 'compact';
  source?: string;
}

const NewsletterSection = ({ variant = 'default', source = 'section' }: NewsletterSectionProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

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
        .insert({ email, source });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already subscribed',
            description: 'This email is already on our newsletter list!',
          });
          setIsSuccess(true);
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        localStorage.setItem('newsletter_subscribed', 'true');
        toast({
          title: 'Successfully subscribed!',
          description: 'Thanks for joining our newsletter.',
        });

        // Send admin notification (fire and forget)
        supabase.functions.invoke('send-admin-notification', {
          body: { type: 'newsletter_signup', data: { email, source } }
        }).catch(err => console.error('Admin notification error:', err));
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

  if (variant === 'compact') {
    return (
      <div className="bg-muted/50 rounded-xl p-6">
        {isSuccess ? (
          <div className="flex items-center gap-3 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">You're subscribed!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email for updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" variant="gradient" disabled={isSubmitting} className="h-11">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Subscribe'
              )}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-foreground/10 mb-6">
            <Mail className="h-7 w-7" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Join Our Newsletter
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            Get the latest listings, exclusive deals, and tips for running a successful mobile food business delivered straight to your inbox.
          </p>

          {isSuccess ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-medium">Thanks for subscribing!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-primary-foreground text-foreground border-0"
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting}
                className="h-12 px-8"
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
          )}

          <p className="text-xs text-primary-foreground/60 mt-4">
            No spam, unsubscribe anytime.{' '}
            <a href="/privacy" className="underline hover:text-primary-foreground">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
