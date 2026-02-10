import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  ArrowRight, 
  Star, 
  Shield, 
  CheckCircle2, 
  QrCode, 
  LayoutGrid, 
  Wallet, 
  Store,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { useHostListings } from '@/hooks/useHostListings';

// --- Sub-Components (Modular Blocks) ---

const ListHero = ({ onStart }: { onStart: () => void }) => (
  <section className="relative py-14 sm:py-20 md:py-32 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
    {/* Decorative orbs */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 right-10 w-64 md:w-96 h-64 md:h-96 bg-primary/6 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-10 w-52 md:w-80 h-52 md:h-80 bg-primary/5 rounded-full blur-3xl" />
    </div>
    <div className="container relative text-center max-w-3xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Badge variant="secondary" className="mb-4 sm:mb-6 text-xs sm:text-sm font-medium">
          Vendibook for Hosts
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-4 sm:mb-6">
          Open for Business.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
          Create a professional digital storefront for your kitchen or parking space. Collect bookings, build reputation, and get paid securely.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" variant="dark-shine" onClick={onStart} className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto shadow-xl w-full sm:w-auto">
            Create Your Storefront
          </Button>
        </div>
        <p className="mt-5 sm:mt-6 text-xs sm:text-sm text-muted-foreground">Free setup • 12.9% success fee • Cancel anytime</p>
      </motion.div>
    </div>
  </section>
);

const StorefrontPreview = () => (
  <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
    <div className="container max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Your brand, front and center.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Vendibook gives you a dedicated profile page that acts as your professional website. Showcase your amenities, collect 5-star reviews, and let customers book you instantly.
            </p>
          </div>

          <div className="mt-8 sm:mt-10 space-y-4 sm:space-y-5">
            {[
              { icon: Store, label: 'Public Storefront', desc: 'A shareable link (vendibook.com/your-kitchen) to send to leads.', color: 'bg-primary/10 text-primary' },
              { icon: Star, label: 'Verified Reviews', desc: 'Build trust with verified ratings from past renters.', color: 'bg-amber-500/10 text-amber-500' },
              { icon: Shield, label: 'Identity Verified', desc: 'Display your "Verified Host" badge to attract serious operators.', color: 'bg-emerald-500/10 text-emerald-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-0 rounded-xl sm:rounded-none bg-card/50 sm:bg-transparent border sm:border-0 border-border/50 shadow-sm sm:shadow-none">
                <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${item.color.split(' ')[0]}`}>
                  <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color.split(' ')[1]}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{item.label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual Mockup - "The Phone" */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative flex justify-center mt-6 md:mt-0"
        >
          <div className="w-[260px] sm:w-[280px] md:w-[320px] bg-card border-4 border-foreground/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
            {/* Mockup Header */}
            <div className="bg-gradient-to-br from-primary to-primary/80 p-5 sm:p-6 pb-8 sm:pb-10 text-white">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 mb-3 flex items-center justify-center text-xl sm:text-2xl font-bold">
                🏠
              </div>
              <div>
                <Badge variant="secondary" className="text-[10px] sm:text-xs mb-1 bg-white/20 text-white border-0">Premium Host</Badge>
                <h3 className="text-lg sm:text-xl font-bold">The Cookhouse</h3>
              </div>
            </div>
            
            {/* Mockup Body */}
            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 -mt-4 bg-card rounded-t-2xl">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Tampa, FL</span>
                <span>•</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                  4.9 (128)
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-14 sm:h-16 w-1/3 bg-muted rounded-lg" />
                <div className="h-14 sm:h-16 w-1/3 bg-muted rounded-lg" />
                <div className="h-14 sm:h-16 w-1/3 bg-muted rounded-lg" />
              </div>

              {/* Review Snippet */}
              <div className="p-2.5 sm:p-3 bg-muted/50 rounded-xl text-xs sm:text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[10px] sm:text-xs truncate">Sarah's Tacos</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs">Oct 2024</p>
                  </div>
                </div>
                <p className="text-muted-foreground italic text-[11px] sm:text-sm leading-relaxed">"Best commissary in Tampa. Clean, organized, and super easy access."</p>
              </div>

              {/* Action Button */}
              <div className="pt-1 sm:pt-2">
                <div className="w-full bg-primary text-primary-foreground text-center py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm">
                  Book Slot - $250/mo
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating UI Elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="absolute -right-2 sm:-right-4 top-1/3 hidden md:block"
          >
            <div className="bg-card border shadow-lg rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Identity Verified</p>
                <p className="text-xs text-muted-foreground">Trusted Host</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);

const OperationsGrid = () => {
  const features = [
    { icon: LayoutGrid, label: 'Multi-Slot Management', desc: 'Have 5 kitchen stations or 20 parking spots? Rent them all simultaneously without double-booking.', color: 'bg-primary/10 text-primary' },
    { icon: QrCode, label: 'Free Signage & QR', desc: 'We send you professional signage. Walk-ins scan the QR code to verify their identity and book instantly.', color: 'bg-amber-500/10 text-amber-500' },
    { icon: Wallet, label: 'Compliance Engine', desc: 'We automatically collect and verify Liability Insurance, ServSafe, and Business Licenses before booking.', color: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">Built for Operations</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We replaced spreadsheets and text messages with a powerful operating system designed for shared spaces.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-6 text-center shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-2xl flex items-center justify-center ${feat.color.split(' ')[0]}`}>
                <feat.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${feat.color.split(' ')[1]}`} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{feat.label}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PricingSimple = () => (
  <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
    <div className="container max-w-3xl mx-auto px-4 text-center">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">Simple, fair pricing.</h2>
      <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 leading-relaxed">
        It costs $0 to list. We only make money when you do.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-xl mx-auto">
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 shadow-lg">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Listing Fee</p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground">$0</p>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-2 leading-relaxed">Unlimited listings. No monthly subscription.</p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border-2 border-primary rounded-2xl p-4 sm:p-6 relative shadow-xl">
          <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs whitespace-nowrap">Most Popular</Badge>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1 mt-1 sm:mt-0">Success Fee</p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground">12.9%</p>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-2 leading-relaxed">Only charged on successful, paid bookings.</p>
        </div>
      </div>
    </div>
  </section>
);

// --- Main Page Component ---

const ListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listings } = useHostListings();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'landing' | 'wizard'>(() => {
    return user ? 'wizard' : 'landing';
  });

  useEffect(() => {
    if (user) {
      setMode('wizard');
    }
  }, [user]);

  const drafts = listings.filter(l => l.status === 'draft');

  useEffect(() => {
    trackEvent({ category: 'Supply', action: 'host_landing_viewed' });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  const handleStart = () => {
    trackEvent({ category: 'Supply', action: 'start_listing_clicked' });
    if (!user) {
      navigate('/auth?redirect=/list?start=true');
      return;
    }
    setMode('wizard');
  };

  if (mode === 'wizard') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-6 sm:py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 sm:mb-6 pl-0 hover:pl-2 transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <QuickStartWizard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-base sm:text-lg">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold">
              V
            </div>
            Host
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {drafts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="hidden sm:flex text-xs">
                Resume Draft ({drafts.length})
              </Button>
            )}
            <Button size="sm" onClick={handleStart} className="text-xs sm:text-sm">
              List Your Space
            </Button>
          </div>
        </div>
      </header>

      <main>
        <ListHero onStart={handleStart} />
        <StorefrontPreview />
        <OperationsGrid />
        <PricingSimple />
        
        {/* Final CTA */}
        <section className="py-14 sm:py-20 md:py-28">
          <div className="container text-center px-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6">Ready to professionalize your space?</h2>
            <Button size="lg" variant="dark-shine" onClick={handleStart} className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto shadow-xl w-full sm:w-auto">
              Get Started Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ListPage;
