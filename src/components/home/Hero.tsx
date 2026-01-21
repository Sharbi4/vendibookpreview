import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import vendibookLogo from '@/assets/vendibook-logo.png';
import heroImage from '@/assets/hero-food-truck.jpg';
import { trackHeroCTAClick } from '@/lib/analytics';

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
              variant="gradient-premium"
              size="lg"
              onClick={() => {
                trackHeroCTAClick('browse');
                navigate('/search');
              }}
              className="text-base px-8 py-6"
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
              className="text-base px-8 py-6 border-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Create a Free Listing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
