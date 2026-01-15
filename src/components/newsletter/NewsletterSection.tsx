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
    
    const trimmedEmail = email.trim().toLowerCase();
    
    // Comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    // Length validation
    if (trimmedEmail.length > 255) {
      toast({
        title: 'Email too long',
        description: 'Email address must be less than 255 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: trimmedEmail, source });

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
                maxLength={255}
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
    <section className="py-16 md:py-20 relative overflow-hidden">
      {/* Orange gradient background - #FF5124 based with subtle hints */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF5124] via-[#FF6B3D] to-[#FF7D4D]" />
      
      {/* Decorative curved lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large curved decorative lines */}
        <svg className="absolute right-0 top-0 h-full w-1/2 opacity-30" viewBox="0 0 400 400" fill="none">
          <circle cx="400" cy="200" r="300" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="400" cy="200" r="250" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="400" cy="200" r="200" stroke="white" strokeWidth="1" fill="none" />
          <circle cx="400" cy="200" r="150" stroke="white" strokeWidth="0.5" fill="none" />
        </svg>
        {/* Additional glow effects - orange themed */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF5124]/25 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
      </div>
      
      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 text-white">
            Subscribe to our email
          </h2>
          <h3 className="text-xl md:text-2xl font-bold mb-8 text-white">
            newsletter for food entrepreneurs!
          </h3>

          {isSuccess ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <CheckCircle className="h-6 w-6 text-white" />
              <span className="text-lg font-medium text-white">Thanks for subscribing!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 max-w-lg mx-auto">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-white text-foreground border-0 rounded-l-full rounded-r-none sm:rounded-r-none px-6 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isSubmitting}
                  maxLength={255}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-14 px-8 rounded-r-full rounded-l-none sm:rounded-l-none text-white font-semibold text-base shadow-lg"
                style={{ backgroundColor: '#FF5124' }}
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

          <p className="text-xs text-white/70 mt-6">
            No spam, unsubscribe anytime.{' '}
            <a href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
