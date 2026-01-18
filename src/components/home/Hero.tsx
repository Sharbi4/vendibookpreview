import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ShieldCheck, CreditCard, Headphones, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import vendibookLogo from '@/assets/vendibook-logo.png';

const Hero = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Parallax multipliers for different orbs (slower = more subtle)
  const parallax1 = scrollY * 0.15;
  const parallax2 = scrollY * 0.1;
  const parallax3 = scrollY * 0.2;

  return (
    <section className="relative overflow-hidden pt-2 pb-6 mx-4 mt-4 rounded-3xl">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-vendibook-cream via-vendibook-cream/80 to-primary/5"
        style={{
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 15s ease infinite',
        }}
      />
      
      {/* Subtle dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* Floating orbs with parallax effect */}
      <div 
        className="absolute w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse transition-transform duration-100 ease-out"
        style={{ 
          top: 40,
          left: '10%',
          animationDuration: '4s',
          transform: `translateY(${parallax1}px) translateX(${parallax1 * 0.3}px)`,
        }} 
      />
      <div 
        className="absolute w-48 h-48 bg-vendibook-orange/20 rounded-full blur-3xl animate-pulse transition-transform duration-100 ease-out"
        style={{ 
          bottom: 0,
          right: '15%',
          animationDuration: '6s', 
          animationDelay: '1s',
          transform: `translateY(${-parallax2}px) translateX(${-parallax2 * 0.5}px)`,
        }} 
      />
      <div 
        className="absolute w-32 h-32 bg-vendibook-teal/20 rounded-full blur-2xl animate-pulse transition-transform duration-100 ease-out"
        style={{ 
          top: '50%',
          left: '60%',
          animationDuration: '5s', 
          animationDelay: '2s',
          transform: `translateY(${parallax3}px) rotate(${scrollY * 0.02}deg)`,
        }} 
      />
      
      {/* Additional decorative orbs */}
      <div 
        className="absolute w-24 h-24 bg-primary/15 rounded-full blur-2xl transition-transform duration-100 ease-out"
        style={{ 
          top: '20%',
          right: '5%',
          transform: `translateY(${parallax2 * 1.2}px)`,
        }} 
      />
      <div 
        className="absolute w-40 h-40 bg-vendibook-orange/15 rounded-full blur-3xl transition-transform duration-100 ease-out"
        style={{ 
          bottom: '30%',
          left: '5%',
          transform: `translateY(${-parallax1 * 0.8}px)`,
        }} 
      />
      
      <div className="container max-w-5xl mx-auto px-4 relative z-10">
        {/* Hero Content */}
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center animate-fade-in">
            <img 
              src={vendibookLogo} 
              alt="Vendibook" 
              className="h-44 md:h-52 w-auto mix-blend-multiply transition-transform duration-300 hover:scale-105 drop-shadow-sm"
            />
          </div>
          
          {/* Headline */}
          <h1 
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight animate-fade-in"
            style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}
          >
            The trusted marketplace for mobile food businesses
          </h1>
          
          {/* Tagline */}
          <p 
            className="text-base md:text-lg text-muted-foreground mt-3 max-w-xl mx-auto animate-fade-in"
            style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}
          >
            Rent, buy, or sell food trucks, trailers, kitchens, and vendor lots—with verification, secure payments, and compliant workflows.
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 animate-fade-in"
            style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}
          >
            <Button
              variant="gradient-premium"
              size="lg"
              onClick={() => navigate('/search')}
              className="text-base px-8 py-6"
            >
              <Search className="mr-2 h-5 w-5" />
              Browse Listings
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/host')}
              className="text-base px-8 py-6 border-2"
            >
              List Your Asset
            </Button>
          </div>

          {/* Trust badges */}
          <div 
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-8 animate-fade-in"
            style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Verified users</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileCheck className="h-4 w-4 text-primary" />
              <span>Document workflows</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Headphones className="h-4 w-4 text-primary" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;
