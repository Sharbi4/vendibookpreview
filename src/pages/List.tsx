import React, { useEffect, useState } from 'react';
import HeaderSearchField from '@/components/layout/HeaderSearchField';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import vendibookLogo from '@/assets/vendibook-logo.png';

// --- Sub-Components (Modular Blocks) ---

const ListHero = ({ onStart }: { onStart: () => void }) => (
  <section className="relative py-16 sm:py-24 md:py-32">
    <div className="max-w-3xl mx-auto px-4 text-center relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur border border-white/60 text-foreground px-3 py-1.5 rounded-full text-sm font-medium mb-6">
          Vendibook for Hosts
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          Open for Business.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Create a professional digital storefront for your kitchen or parking space. Collect bookings, build reputation, and get paid securely.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" variant="dark-shine" onClick={onStart} className="text-base sm:text-lg px-8 py-6 h-auto shadow-xl rounded-xl w-full sm:w-auto">
            Create Your Storefront
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Free setup • 12.9% success fee • Cancel anytime</p>
      </motion.div>
    </div>
  </section>
);

const StorefrontPreview = () => (
  <section className="py-14 sm:py-20 md:py-28">
    <div className="max-w-6xl mx-auto px-4">
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

          <div className="mt-10 space-y-4">
            {[
              { icon: Store, label: 'Public Storefront', desc: 'A shareable link (vendibook.com/your-kitchen) to send to leads.' },
              { icon: Star, label: 'Verified Reviews', desc: 'Build trust with verified ratings from past renters.' },
              { icon: Shield, label: 'Identity Verified', desc: 'Display your "Verified Host" badge to attract serious operators.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-lg hover:bg-white/70 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(14,100%,57%)]/15 to-[hsl(40,100%,49%)]/15 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{item.label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Visual Mockup — "The Phone" */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative flex justify-center mt-6 md:mt-0"
        >
          <div className="w-[260px] sm:w-[280px] md:w-[320px] bg-white/70 backdrop-blur-xl border-4 border-white/40 rounded-[2.5rem] shadow-2xl shadow-black/10 overflow-hidden">
            {/* Mockup Header */}
            <div className="bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] p-5 sm:p-6 pb-8 sm:pb-10 text-white">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 mb-3 flex items-center justify-center text-xl sm:text-2xl font-bold">
                🏠
              </div>
              <div>
                <Badge variant="secondary" className="text-[10px] sm:text-xs mb-1 bg-white/20 text-white border-0">Premium Host</Badge>
                <h3 className="text-lg sm:text-xl font-bold">The Cookhouse</h3>
              </div>
            </div>
            
            {/* Mockup Body */}
            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 -mt-4 bg-white/80 backdrop-blur rounded-t-2xl">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Tampa, FL</span>
                <span>•</span>
                <div className="flex items-center gap-1 text-[hsl(14,100%,57%)]">
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                  4.9 (128)
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-14 sm:h-16 w-1/3 bg-[hsl(14,100%,57%)]/10 rounded-lg" />
                <div className="h-14 sm:h-16 w-1/3 bg-[hsl(40,100%,49%)]/10 rounded-lg" />
                <div className="h-14 sm:h-16 w-1/3 bg-[hsl(14,100%,57%)]/10 rounded-lg" />
              </div>

              {/* Review Snippet */}
              <div className="p-2.5 sm:p-3 bg-white/60 backdrop-blur rounded-xl text-xs sm:text-sm border border-white/60">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[hsl(14,100%,57%)]/20 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[10px] sm:text-xs truncate">Sarah's Tacos</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs">Oct 2024</p>
                  </div>
                </div>
                <p className="text-muted-foreground italic text-[11px] sm:text-sm leading-relaxed">"Best commissary in Tampa. Clean, organized, and super easy access."</p>
              </div>

              {/* Action Button */}
              <div className="pt-1 sm:pt-2">
                <div className="w-full bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] text-white text-center py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm shadow-lg">
                  Book Slot - $250/mo
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating UI Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="absolute -right-2 sm:-right-4 top-1/3 hidden md:block"
          >
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(14,100%,57%)]/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-[hsl(14,100%,57%)]" />
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
    { icon: LayoutGrid, label: 'Multi-Slot Management', desc: 'Have 5 kitchen stations or 20 parking spots? Rent them all simultaneously without double-booking.' },
    { icon: QrCode, label: 'Free Signage & QR', desc: 'We send you professional signage. Walk-ins scan the QR code to verify their identity and book instantly.' },
    { icon: Wallet, label: 'Compliance Engine', desc: 'We automatically collect and verify Liability Insurance, ServSafe, and Business Licenses before booking.' },
  ];

  return (
    <section className="py-14 sm:py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Built for Operations</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We replaced spreadsheets and text messages with a powerful operating system designed for shared spaces.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-[hsl(14,100%,57%)]/10 hover:border-[hsl(14,100%,57%)]/30 transition-all p-6 text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/15 to-[hsl(40,100%,49%)]/15 flex items-center justify-center">
                <feat.icon className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feat.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PricingSimple = () => (
  <section className="py-14 sm:py-20 md:py-28">
    <div className="max-w-3xl mx-auto px-4 text-center">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, fair pricing.</h2>
      <p className="text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed">
        It costs $0 to list. We only make money when you do.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl mx-auto">
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 p-5 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Listing Fee</p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground">$0</p>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-2 leading-relaxed">Unlimited listings. No monthly subscription.</p>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border-2 border-[hsl(14,100%,57%)]/40 shadow-xl shadow-[hsl(14,100%,57%)]/10 p-5 sm:p-6 relative">
          <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs whitespace-nowrap bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] text-white border-0">Most Popular</Badge>
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
      <div className="min-h-screen relative overflow-x-hidden">
        {/* Gradient BG */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,20%,97%)] via-[hsl(30,15%,96%)] to-[hsl(35,10%,95%)]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto py-6 sm:py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 pl-0 hover:pl-2 transition-all"
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
    <div className="min-h-screen relative overflow-x-hidden">
      {/* ══ FULL-PAGE GRADIENT BACKGROUND ══ */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,20%,97%)] via-[hsl(30,15%,96%)] to-[hsl(35,10%,95%)]" />
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-[hsl(14,100%,57%)]/20 blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -50, 60, 0], y: [0, 40, -40, 0], scale: [1, 0.85, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-32 w-[800px] h-[800px] rounded-full bg-[hsl(40,100%,49%)]/15 blur-[170px]"
        />
        <motion.div
          animate={{ x: [0, 30, -40, 0], y: [0, -30, 50, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[hsl(14,80%,50%)]/12 blur-[130px]"
        />
      </div>

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-50 w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)] via-[hsl(20,90%,50%)] to-[hsl(40,100%,49%)]" />
          <div className="absolute inset-0 hp2-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="absolute inset-0 backdrop-blur-md bg-black/5" />
          <div className="relative max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <img src={vendibookFavicon} alt="Vendibook" className="h-8 w-auto drop-shadow-lg sm:hidden" />
              <img src={vendibookLogo} alt="Vendibook" className="hidden sm:block h-24 w-auto drop-shadow-lg brightness-0 invert" />
            </Link>
            <div className="flex items-center gap-2">
              <HeaderSearchField />
              {drafts.length > 0 && (
                <Button variant="dark-shine" size="sm" onClick={() => navigate('/dashboard')} className="hidden sm:flex h-8 rounded-xl text-xs font-semibold px-4">
                  Resume Draft ({drafts.length})
                </Button>
              )}
              <Button variant="dark-shine" size="sm" onClick={handleStart} className="h-8 rounded-xl text-xs font-semibold px-4">
                List Your Space
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ListHero onStart={handleStart} />
        <StorefrontPreview />
        <OperationsGrid />
        <PricingSimple />
        
        {/* Final CTA */}
        <section className="py-16 sm:py-24 md:py-28">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div
              className="rounded-3xl bg-gradient-to-br from-[hsl(14,100%,57%)] via-[hsl(20,90%,50%)] to-[hsl(40,100%,49%)] p-10 md:p-14 text-center text-white shadow-2xl shadow-[hsl(14,100%,57%)]/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Ready to professionalize your space?</h2>
              <p className="text-lg opacity-90 mb-8">Create your first listing in under 5 minutes. No monthly fees.</p>
              <Button size="lg" onClick={handleStart} className="text-base sm:text-lg px-8 py-6 h-auto bg-white text-gray-900 hover:bg-white/90 rounded-xl shadow-xl w-full sm:w-auto">
                Get Started Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ListPage;
