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
  Star,
  ChevronRight,
  Lightbulb,
  Lock,
  CreditCard,
  ShieldCheck,
  BadgeCheck,
  FileEdit,
  ImageIcon,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { ImportListingWizard } from '@/components/listing-wizard/ImportListingWizard';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import vendibookIcon from '@/assets/vendibook-icon.png';
import { useHostListings } from '@/hooks/useHostListings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ListingMode = 'choose' | 'import' | 'scratch';

const benefits = [
  { icon: DollarSign, text: 'Earn $500-2,000/week', subtext: 'Average host earnings' },
  { icon: Shield, text: 'Secure payments', subtext: 'Stripe-powered escrow' },
  { icon: Clock, text: 'List in 5 minutes', subtext: 'AI-assisted creation' },
];

const tips = [
  'Clear photos increase bookings by 40%',
  'Complete profiles get 2x more inquiries',
  'Competitive pricing fills your calendar faster',
];

const ListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { listings, isLoading: listingsLoading, deleteListing } = useHostListings();
  const [mode, setMode] = useState<ListingMode>('choose');
  const [currentTip, setCurrentTip] = useState(0);

  // Filter drafts
  const drafts = listings.filter(l => l.status === 'draft');

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
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20 border border-border">
            <img src={vendibookIcon} alt="Vendibook" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-3xl font-bold mb-3">List your asset</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Join thousands of hosts earning on Vendibook
          </p>
        </motion.div>


        {/* Listing options */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Import option - primary with gradient */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-primary/20 shadow-xl cursor-pointer transition-all hover:shadow-2xl hover:border-primary/40 group"
            onClick={() => {
              trackEvent({
                category: 'Supply',
                action: 'listing_mode_selected',
                label: 'import',
              });
              setMode('import');
            }}
          >
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-r from-primary/15 via-amber-500/10 to-yellow-400/5 border-b border-primary/20 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shrink-0 shadow-lg">
                  <Upload className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-lg">Import a listing</p>
                    <Badge className="text-xs bg-gradient-to-r from-primary/20 to-amber-500/20 text-primary border-primary/30">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI-powered
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paste your Facebook post, Craigslist ad, or URL
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </div>
            {/* White Content */}
            <div className="relative bg-white dark:bg-card px-6 py-4">
              <p className="text-sm text-muted-foreground">
                We'll create your draft in seconds with AI-powered extraction
              </p>
            </div>
          </div>

          {/* Start from scratch option */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg cursor-pointer transition-all hover:shadow-xl hover:border-primary/30 group"
            onClick={() => {
              trackEvent({
                category: 'Supply',
                action: 'listing_mode_selected',
                label: 'scratch',
              });
              setMode('scratch');
            }}
          >
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-r from-muted/80 via-muted/50 to-transparent border-b border-border px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 flex items-center justify-center shrink-0 shadow-md">
                  <PenLine className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">Start from scratch</p>
                  <p className="text-sm text-muted-foreground">
                    Build your listing step by step
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </div>
            </div>
            {/* White Content */}
            <div className="relative bg-white dark:bg-card px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Our guided wizard helps you create a professional listing
              </p>
            </div>
          </div>
        </motion.div>


        {/* Trust Badges Section */}
        <motion.div 
          className="relative overflow-hidden rounded-2xl border-2 border-primary/20 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Gradient Header */}
          <div className="relative bg-gradient-to-r from-primary/15 via-amber-500/10 to-yellow-400/5 border-b border-primary/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-amber-500/30 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Security & Payment Guarantees</h3>
            </div>
          </div>
          
          {/* White Content Area */}
          <div className="relative bg-white dark:bg-card p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 bg-gradient-to-br from-primary/5 to-amber-500/5 rounded-xl p-3 border border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Secure Escrow</p>
                  <p className="text-[10px] text-muted-foreground">Funds held safely until delivery</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-gradient-to-br from-primary/5 to-amber-500/5 rounded-xl p-3 border border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Stripe Powered</p>
                  <p className="text-[10px] text-muted-foreground">Bank-level encryption</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-gradient-to-br from-primary/5 to-amber-500/5 rounded-xl p-3 border border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Verified Renters</p>
                  <p className="text-[10px] text-muted-foreground">ID verification required</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-gradient-to-br from-primary/5 to-amber-500/5 rounded-xl p-3 border border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Fraud Protection</p>
                  <p className="text-[10px] text-muted-foreground">24/7 transaction monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rotating tips */}
        <motion.div 
          className="relative overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="relative bg-gradient-to-r from-primary/15 via-amber-500/10 to-yellow-400/5 border-b border-primary/20 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/30 to-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold">Pro tip</p>
            </div>
          </div>
          <div className="relative bg-white dark:bg-card px-5 py-4">
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
          className="relative overflow-hidden rounded-2xl border-2 border-primary/10 shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="relative bg-white dark:bg-card px-5 py-4">
            <div className="flex items-center justify-center gap-6 text-xs">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">Verified hosts</span>
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20">
                <Star className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">5-star reviews</span>
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">Growing marketplace</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // Compact drafts sidebar component
  const DraftsSidebar = () => {
    if (!user || drafts.length === 0 || mode !== 'choose') return null;
    
    return (
      <motion.aside
        className="hidden lg:block w-56 shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="sticky top-24 space-y-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <FileEdit className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drafts</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {drafts.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {drafts.slice(0, 5).map((draft) => (
              <div
                key={draft.id}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/edit-listing/${draft.id}`)}
              >
                {draft.cover_image_url ? (
                  <img
                    src={draft.cover_image_url}
                    alt={draft.title}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {draft.title || 'Untitled'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {draft.category?.replace('_', ' ') || 'No category'}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{draft.title || 'Untitled Draft'}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteListing(draft.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
          {drafts.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[10px] text-muted-foreground h-7"
              onClick={() => navigate('/dashboard')}
            >
              View all {drafts.length} drafts
            </Button>
          )}
        </div>
      </motion.aside>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4">
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

      {/* Content with sidebar layout */}
      <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex gap-8">
          <DraftsSidebar />
          <div className="flex-1 max-w-2xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListPage;
