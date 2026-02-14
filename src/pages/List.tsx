import React, { useEffect, useState } from 'react';
import HeaderSearchField from '@/components/layout/HeaderSearchField';
import AppDropdownMenu from '@/components/layout/AppDropdownMenu';
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
  MapPin,
  Sparkles,
  Bot,
  Share2,
  Search,
  CreditCard,
  Banknote,
  Lock,
  ShoppingBag,
  TrendingUp,
  Megaphone
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
          Vendibook for Hosts & Sellers
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          List It. Sell It. Rent It.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Whether you're renting a kitchen, selling equipment, or listing a parking space — Vendibook gives you the tools to go live in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" variant="dark-shine" onClick={onStart} className="text-base sm:text-lg px-8 py-6 h-auto shadow-xl rounded-xl w-full sm:w-auto">
            Create Step-by-Step
          </Button>
          <Button size="lg" variant="gradient" onClick={() => window.location.href = '/list/ai'} className="text-base sm:text-lg px-8 py-6 h-auto shadow-xl rounded-xl w-full sm:w-auto">
            <Bot className="h-5 w-5 mr-2" />
            Create with VendiBot
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">Use our traditional wizard or let VendiBot AI build your listing in under a minute</p>
      </motion.div>
    </div>
  </section>
);

const ListingBuildAnimation = () => {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.3, delayChildren: 0.2 } },
  };
  const item = (delay = 0) => ({
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, delay, ease: 'easeOut' as const } },
  });

  return (
    <section className="py-10 sm:py-16 md:py-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3"
          >
            Your listing, ready in seconds
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground text-base sm:text-lg"
          >
            Watch a listing come to life.
          </motion.p>
        </div>

        <div className="flex justify-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="w-full max-w-md"
          >
            {/* Card Shell */}
            <motion.div
              variants={item()}
              className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-black/10 overflow-hidden"
            >
              {/* Image placeholder with shimmer */}
              <motion.div
                variants={item(0)}
                className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 overflow-hidden"
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold text-foreground shadow-lg flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Verified
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                  className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/70 to-transparent"
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-3 left-4 flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">🏠</div>
                  <span className="text-xs font-medium text-foreground/80">Tampa, FL</span>
                </motion.div>
              </motion.div>

              {/* Content */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Title typing animation */}
                <motion.div variants={item(0.4)}>
                  <motion.h3
                    className="text-lg sm:text-xl font-bold text-foreground"
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    The Cookhouse — Shared Kitchen
                  </motion.h3>
                </motion.div>

                {/* Badges row */}
                <motion.div variants={item(0.6)} className="flex flex-wrap gap-2">
                  {['Shared Kitchen', 'Tampa, FL', 'Instant Book'].map((tag, i) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.2 + i * 0.15, type: 'spring', stiffness: 300 }}
                      className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>

                {/* Rating + Reviews */}
                <motion.div variants={item(0.8)} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 text-primary">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, rotateY: 90 }}
                        whileInView={{ opacity: 1, rotateY: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.6 + i * 0.1 }}
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </motion.div>
                    ))}
                  </div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 2.2 }}
                  >
                    4.9 (128 reviews)
                  </motion.span>
                </motion.div>

                {/* Price row */}
                <motion.div
                  variants={item(1)}
                  className="flex items-end justify-between pt-2 border-t border-border/50"
                >
                  <div>
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 2.4 }}
                      className="text-2xl font-bold text-foreground"
                    >
                      $250
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 2.6, type: 'spring', stiffness: 200 }}
                  >
                    <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold shadow-lg shadow-primary/20">
                      Book Now
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Floating notification */}
            <motion.div
              initial={{ opacity: 0, x: 60, y: -20 }}
              whileInView={{ opacity: 1, x: 40, y: -40 }}
              viewport={{ once: true }}
              transition={{ delay: 3, type: 'spring', stiffness: 120 }}
              className="hidden sm:flex ml-auto w-fit items-center gap-2.5 bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-xl p-3 -mt-6 relative z-10"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Share Kit ready</p>
                <p className="text-[10px] text-muted-foreground">QR code + social captions</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { icon: Bot, label: 'Create with AI', desc: 'Answer a few questions and VendiBot writes your title, description, and optimizes your photos — under 1 minute.' },
    { icon: Store, label: 'Go Live', desc: 'Publish a professional storefront. Choose to rent or sell. Accept card payments online or cash in person.' },
    { icon: Share2, label: 'Share & Grow', desc: 'Use the built-in Share Kit to post to social media, generate QR codes, and track who\'s clicking.' },
    { icon: Wallet, label: 'Get Paid', desc: 'Online payments are held in escrow and released securely. Cash payments are handled directly between you and your customer.' },
  ];

  return (
    <section className="py-14 sm:py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From listing to payout — four simple steps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/30 transition-all p-6 text-center relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shadow-md">
                {i + 1}
              </div>
              <div className="w-14 h-14 mx-auto mb-4 mt-2 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const RentOrSell = () => (
  <section className="py-14 sm:py-20 md:py-28">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Rent or Sell — You Decide</h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Two listing modes, one powerful platform.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* For Rent Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl p-6 sm:p-8 transition-all"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">For Rent</Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Shared Kitchens, Parking & More</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            List your space by the hour, day, week, or month. Accept bookings online or let walk-ins pay in person.
          </p>
          <div className="space-y-3">
            {[
              { icon: LayoutGrid, text: 'Multi-slot management — no double bookings' },
              { icon: Star, text: 'Collect verified reviews from renters' },
              { icon: Shield, text: 'Compliance engine for licenses & insurance' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                <item.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* For Sale Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl p-6 sm:p-8 transition-all"
        >
          <Badge className="mb-4 bg-accent/10 text-accent-foreground border-accent/20">For Sale</Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Equipment, Trucks & Supplies</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Set your price, accept offers, and choose how to get paid — card online with escrow protection or cash in person.
          </p>
          <div className="space-y-3">
            {[
              { icon: ShoppingBag, text: 'Buyer pays online — funds held in escrow' },
              { icon: Banknote, text: 'Or choose "Pay in Person" for cash deals' },
              { icon: TrendingUp, text: 'Make & receive offers with counter-offers' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                <item.icon className="h-4 w-4 text-accent-foreground flex-shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const ToolsGrid = () => {
  const features = [
    { icon: Bot, label: 'AI Listing Creator', desc: 'VendiBot writes your listing in under a minute. Upload photos, answer a few prompts, done.' },
    { icon: Search, label: 'Built-In SEO', desc: 'Every listing is optimized for Google. Your storefront gets indexed so buyers and renters find you.' },
    { icon: Share2, label: 'Share Kit', desc: 'Generate social media captions, QR codes, and branded graphics. Track every click.' },
    { icon: QrCode, label: 'Free Signage & QR', desc: 'We send you professional signage. Walk-ins scan the QR code to book or buy instantly.' },
    { icon: Lock, label: 'Safe Escrow', desc: 'Online payments are held securely until the deal is done. Deposits refunded automatically.' },
    { icon: Megaphone, label: 'Product Listings', desc: 'Showcase your full catalog — kitchens, trucks, equipment, parking — all in one storefront.' },
  ];

  return (
    <section className="py-14 sm:py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Everything You Need to Succeed</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Professional tools built into every listing — no extra apps, no extra cost.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/30 transition-all p-6 text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
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

const PaymentOptions = () => (
  <section className="py-14 sm:py-20 md:py-28">
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Get Paid Your Way</h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Accept card, bank transfer, buy-now-pay-later, or good old cash.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl p-6 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Pay Online</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Card, ACH, Afterpay, Klarna, Affirm — all processed through our secure escrow. Funds are held until the deal is complete.
          </p>
          <p className="text-xs text-muted-foreground">12.9% success fee on completed transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl p-6 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-4">
            <Banknote className="h-6 w-6 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Pay in Person</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Prefer cash? Enable "Pay in Person" and handle payment directly with your customer. No Stripe setup required.
          </p>
          <p className="text-xs text-muted-foreground">$0 platform fee on in-person payments</p>
        </motion.div>
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
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-background" />
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

          {/* AI Create CTA */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            className="mb-6 rounded-2xl border border-white/20 bg-foreground/90 backdrop-blur-xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-foreground/95 transition-all shadow-2xl shadow-black/20"
            onClick={() => navigate('/list/ai')}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-background">Create with VendiBot — under 1 minute</h3>
              <p className="text-xs text-background/60 mt-0.5">Answer a few questions and our AI builds your listing for you. Upload photos, get a polished title & description.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-background/50 shrink-0 hidden sm:block" />
          </motion.div>

          <QuickStartWizard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* ══ FULL-PAGE GRADIENT BACKGROUND ══ */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -50, 60, 0], y: [0, 40, -40, 0], scale: [1, 0.85, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-32 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[170px]"
        />
        <motion.div
          animate={{ x: [0, 30, -40, 0], y: [0, -30, 50, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[130px]"
        />
      </div>

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-50 w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-accent" />
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
              <Button variant="dark-shine" size="sm" onClick={handleStart} className="hidden sm:flex h-8 rounded-xl text-xs font-semibold px-4">
                List Your Space
              </Button>
              <AppDropdownMenu variant="dark" />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ListHero onStart={handleStart} />
        <ListingBuildAnimation />
        <HowItWorks />
        <RentOrSell />
        <ToolsGrid />
        <PaymentOptions />
        
        {/* Final CTA */}
        <section className="py-16 sm:py-24 md:py-28">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div
              className="rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-10 md:p-14 text-center text-white shadow-2xl shadow-primary/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Ready to start listing?</h2>
              <p className="text-lg opacity-90 mb-8">Create your first listing in under 5 minutes. Rent or sell — your call.</p>
              <Button size="lg" onClick={handleStart} className="text-base sm:text-lg px-8 py-6 h-auto bg-white text-foreground hover:bg-white/90 rounded-xl shadow-xl w-full sm:w-auto">
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
