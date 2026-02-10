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
  <section className="relative py-20 md:py-32 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
    <div className="container relative text-center max-w-3xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Badge variant="secondary" className="mb-6 text-sm font-medium">
          Vendibook for Hosts
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          Open for Business.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Create a professional digital storefront for your kitchen or parking space. Collect bookings, build reputation, and get paid securely.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" onClick={onStart} className="text-lg px-8 py-6 h-auto">
            Create Your Storefront
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Free setup • 12.9% success fee • Cancel anytime</p>
      </motion.div>
    </div>
  </section>
);

const StorefrontPreview = () => (
  <section className="py-16 md:py-24 bg-muted/30">
    <div className="container max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Your brand, front and center.
            </h2>
            <p className="text-lg text-muted-foreground">
              Vendibook gives you a dedicated profile page that acts as your professional website. Showcase your amenities, collect 5-star reviews, and let customers book you instantly.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Public Storefront</h3>
                <p className="text-sm text-muted-foreground">A shareable link (vendibook.com/your-kitchen) to send to leads.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Verified Reviews</h3>
                <p className="text-sm text-muted-foreground">Build trust with verified ratings from past renters.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Identity Verified</h3>
                <p className="text-sm text-muted-foreground">Display your "Verified Host" badge to attract serious operators.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Visual Mockup - "The Phone" */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative flex justify-center"
        >
          <div className="w-[280px] md:w-[320px] bg-card border-4 border-foreground/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
            {/* Mockup Header */}
            <div className="bg-gradient-to-br from-primary to-primary/80 p-6 pb-10 text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 mb-3 flex items-center justify-center text-2xl font-bold">
                🏠
              </div>
              <div>
                <Badge variant="secondary" className="text-xs mb-1 bg-white/20 text-white border-0">Premium Host</Badge>
                <h3 className="text-xl font-bold">The Cookhouse</h3>
              </div>
            </div>
            
            {/* Mockup Body */}
            <div className="p-5 space-y-4 -mt-4 bg-card rounded-t-2xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Tampa, FL
                <span>•</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  4.9 (128)
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-16 w-1/3 bg-muted rounded-lg" />
                <div className="h-16 w-1/3 bg-muted rounded-lg" />
                <div className="h-16 w-1/3 bg-muted rounded-lg" />
              </div>

              {/* Review Snippet */}
              <div className="p-3 bg-muted/50 rounded-xl text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary/20" />
                  <div>
                    <p className="font-medium text-foreground text-xs">Sarah's Tacos</p>
                    <p className="text-muted-foreground text-xs">Oct 2024</p>
                  </div>
                </div>
                <p className="text-muted-foreground italic">"Best commissary in Tampa. Clean, organized, and super easy access."</p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <div className="w-full bg-primary text-primary-foreground text-center py-3 rounded-xl font-semibold text-sm">
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
            className="absolute -right-4 top-1/3 hidden md:block"
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

const OperationsGrid = () => (
  <section className="py-16 md:py-24">
    <div className="container max-w-5xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for Operations</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We replaced spreadsheets and text messages with a powerful operating system designed for shared spaces.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0 }}
          className="bg-card border rounded-2xl p-6 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LayoutGrid className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Multi-Slot Management</h3>
          <p className="text-sm text-muted-foreground">
            Have 5 kitchen stations or 20 parking spots? Rent them all simultaneously without double-booking.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-card border rounded-2xl p-6 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <QrCode className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Free Signage & QR</h3>
          <p className="text-sm text-muted-foreground">
            We send you professional signage. Walk-ins scan the QR code to verify their identity and book instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-card border rounded-2xl p-6 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Compliance Engine</h3>
          <p className="text-sm text-muted-foreground">
            We automatically collect and verify Liability Insurance, ServSafe, and Business Licenses before booking.
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

const PricingSimple = () => (
  <section className="py-16 md:py-24 bg-muted/30">
    <div className="container max-w-3xl mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, fair pricing.</h2>
      <p className="text-lg text-muted-foreground mb-10">
        It costs $0 to list. We only make money when you do.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 max-w-xl mx-auto">
        <div className="bg-card border rounded-2xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Listing Fee</p>
          <p className="text-4xl font-bold text-foreground">$0</p>
          <p className="text-sm text-muted-foreground mt-2">Unlimited listings. No monthly subscription.</p>
        </div>
        <div className="bg-card border-2 border-primary rounded-2xl p-6 relative">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
          <p className="text-sm text-muted-foreground mb-1">Success Fee</p>
          <p className="text-4xl font-bold text-foreground">12.9%</p>
          <p className="text-sm text-muted-foreground mt-2">Only charged on successful, paid bookings.</p>
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
  const [mode, setMode] = useState<'landing' | 'wizard'>('landing');

  // Auto-enter wizard mode when ?start=true and user is logged in
  useEffect(() => {
    if (searchParams.get('start') === 'true' && user) {
      setMode('wizard');
    }
  }, [searchParams, user]);

  // Filter drafts for a "Resume" banner if needed
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

  // If user clicks "Start" and is logged in, show the Wizard
  if (mode === 'wizard') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => setMode('landing')}
            className="mb-6 pl-0 hover:pl-2 transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to overview
          </Button>
          <QuickStartWizard />
        </div>
      </div>
    );
  }

  // Landing Page View
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header for easy access */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              V
            </div>
            Host
          </button>
          <div className="flex items-center gap-3">
            {drafts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="hidden sm:flex">
                Resume Draft ({drafts.length})
              </Button>
            )}
            <Button size="sm" onClick={handleStart}>
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
        <section className="py-20 md:py-28">
          <div className="container text-center px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Ready to professionalize your space?</h2>
            <Button size="lg" onClick={handleStart} className="text-lg px-8 py-6 h-auto">
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
