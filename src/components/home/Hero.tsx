import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import vendibookLogo from '@/assets/vendibook-logo.png';
import heroImage from '@/assets/hero-food-truck.jpg';
import { trackHeroCTAClick } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [scrollY, setScrollY] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setIsGoogleLoading(false);
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const url = data?.url;
      if (url) {
        try {
          (window.top ?? window).location.assign(url);
        } catch {
          window.location.assign(url);
        }
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      toast({
        title: 'Google sign-in failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Parallax multipliers for different orbs (slower = more subtle)
  const parallax1 = scrollY * 0.15;
  const parallax2 = scrollY * 0.1;
  const parallax3 = scrollY * 0.2;

  return (
    <section className="relative overflow-hidden pt-2 pb-6 mx-4 mt-4 rounded-3xl">
      {/* Hero background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-primary/20"
      />
      
      <div className="container max-w-5xl mx-auto px-4 relative z-10">
        {/* Hero Content */}
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center animate-fade-in">
            <img 
              src={vendibookLogo} 
              alt="Vendibook" 
              className="h-44 md:h-52 w-auto transition-transform duration-300 hover:scale-105 drop-shadow-lg brightness-0 invert"
            />
          </div>
          

          {/* Headline */}
          <h1 
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight animate-fade-in"
            style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}
          >
            The trusted marketplace for mobile food businesses
          </h1>
          

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 animate-fade-in"
            style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}
          >
            <Button
              size="lg"
              onClick={() => {
                trackHeroCTAClick('browse');
                navigate('/search');
              }}
              className="text-base px-8 py-6 bg-black hover:bg-black/90 text-white"
            >
              <Search className="mr-2 h-5 w-5" />
              Browse Listings
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                trackHeroCTAClick('list');
                navigate('/list');
              }}
              className="text-base px-8 py-6 border-2 bg-black hover:bg-black/90 border-black text-white"
            >
              Create a Free Listing
            </Button>
          </div>

          {/* Google Sign-in for logged out users */}
          {!user && (
            <div 
              className="mt-4 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="bg-white hover:bg-gray-50 text-gray-700 border-white/50 gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
