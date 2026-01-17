import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  Upload, 
  PenLine, 
  Sparkles, 
  Shield, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Users,
  Star,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { ImportListingWizard } from '@/components/listing-wizard/ImportListingWizard';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import vendibookIcon from '@/assets/vendibook-icon.png';

type ListingMode = 'choose' | 'import' | 'scratch';

const benefits = [
  { icon: DollarSign, text: 'Earn $500-2,000/week', subtext: 'Average host earnings' },
  { icon: Shield, text: 'Secure payments', subtext: 'Stripe-powered escrow' },
  { icon: Clock, text: 'List in 5 minutes', subtext: 'AI-assisted creation' },
];

const stats = [
  { value: '2,500+', label: 'Active listings' },
  { value: '$1.2M+', label: 'Host earnings' },
  { value: '4.9★', label: 'Avg review' },
];

const tips = [
  'Clear photos increase bookings by 40%',
  'Complete profiles get 2x more inquiries',
  'Competitive pricing fills your calendar faster',
];

const ListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<ListingMode>('choose');
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    trackEvent({
      category: 'Supply',
      action: 'start_listing_page_viewed',
    });
  }, []);

  // Rotate tips
  useEffect(() => {
    if (mode !== 'choose') return;
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleBack = () => {
    if (mode === 'choose') {
      navigate(-1);
    } else {
      setMode('choose');
    }
  };

  const renderContent = () => {
    if (mode === 'import') {
      return <ImportListingWizard />;
    }

    if (mode === 'scratch') {
      return <QuickStartWizard />;
    }

    // Enhanced choose mode
    return (
      <div className="space-y-8">
        {/* Hero section */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <img src={vendibookIcon} alt="Vendibook" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-3xl font-bold mb-3">List your asset</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Join thousands of hosts earning on Vendibook
          </p>
        </motion.div>


        {/* Listing options */}
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Import option - primary with gradient */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg border-2 border-primary/20 hover:border-primary/50 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden group"
            onClick={() => {
              trackEvent({
                category: 'Supply',
                action: 'listing_mode_selected',
                label: 'import',
              });
              setMode('import');
            }}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md">
                <Upload className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-lg">Import a listing</p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-powered
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Paste your Facebook post, Craigslist ad, or URL — we'll create your draft in seconds
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </CardContent>
          </Card>

          {/* Start from scratch option */}
          <Card
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 group"
            onClick={() => {
              trackEvent({
                category: 'Supply',
                action: 'listing_mode_selected',
                label: 'scratch',
              });
              setMode('scratch');
            }}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <PenLine className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">Start from scratch</p>
                <p className="text-sm text-muted-foreground">
                  Build your listing step by step with our guided wizard
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits section */}
        <motion.div 
          className="bg-muted/50 rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-semibold text-center mb-4">Why list on Vendibook?</h3>
          <div className="grid gap-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{benefit.text}</p>
                  <p className="text-xs text-muted-foreground">{benefit.subtext}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Rotating tips */}
        <motion.div 
          className="bg-muted/50 rounded-2xl p-4 flex items-start gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-h-[40px]">
            <p className="text-sm font-medium">Pro tip</p>
            <motion.p 
              key={currentTip}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-sm text-muted-foreground"
            >
              {tips[currentTip]}
            </motion.p>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div 
          className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Verified hosts
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            5-star reviews
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Growing marketplace
          </span>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">List your asset</h1>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {renderContent()}
      </div>
    </div>
  );
};

export default ListPage;
