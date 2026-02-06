import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  Shield, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Star,
  ChevronRight,
  FileEdit,
  ImageIcon,
  Trash2,
  LayoutGrid,
  QrCode,
  CalendarRange,
  FileCheck,
  Wallet,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
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

type ListingMode = 'choose' | 'scratch';

const featureCards = [
  {
    icon: LayoutGrid,
    title: 'Multi-Slot Management',
    description: 'Define up to 100 workstations, prep spots, or parking spaces with named slots.',
  },
  {
    icon: QrCode,
    title: 'QR Check-In Signage',
    description: 'Generate branded QR codes for each slot. Renters scan to check in instantly.',
  },
  {
    icon: CalendarRange,
    title: 'Smart Availability',
    description: 'Daily, weekly, or monthly bookings with automatic conflict prevention.',
  },
  {
    icon: FileCheck,
    title: 'Document Compliance',
    description: 'Collect health permits, insurance, and licenses before booking starts.',
  },
  {
    icon: Wallet,
    title: 'Secure Payouts',
    description: 'Stripe-powered payments with deposits and automatic host payouts.',
  },
  {
    icon: Shield,
    title: 'Verified Renters',
    description: 'ID verification and business info collection protects your space.',
  },
];

const ListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { listings, isLoading: listingsLoading, deleteListing } = useHostListings();
  const [mode, setMode] = useState<ListingMode>('choose');

  // Filter drafts
  const drafts = listings.filter(l => l.status === 'draft');

  useEffect(() => {
    trackEvent({
      category: 'Supply',
      action: 'start_listing_page_viewed',
    });
  }, []);

  // Scroll to top when mode changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleStartListing = () => {
    trackEvent({
      category: 'Supply',
      action: 'listing_mode_selected',
      label: 'scratch',
    });
    // Require auth before creating a listing
    if (!user) {
      navigate('/auth?redirect=/list');
      return;
    }
    setMode('scratch');
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Drafts</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {drafts.length}
            </Badge>
          </div>
          
          <div className="space-y-1">
            {drafts.slice(0, 5).map((draft) => (
              <div
                key={draft.id}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/create-listing/${draft.id}`)}
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
                    {draft.title || 'Untitled Listing'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {draft.category?.replace('_', ' ') || 'Draft'}
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
              variant="dark-shine"
              size="sm"
              className="w-full h-7"
              onClick={() => navigate('/dashboard')}
            >
              View all {drafts.length} drafts
            </Button>
          )}
        </div>
      </motion.aside>
    );
  };

  const renderContent = () => {
    if (mode === 'scratch') {
      if (!user) {
        navigate('/auth?redirect=/list');
        return null;
      }
      return <QuickStartWizard />;
    }

    // Host Benefits / Landing Page
    return (
      <div className="space-y-12">
        {/* Hero Section */}
        <motion.div 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1.5" />
            The #1 Marketplace for Food Spaces
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            Turn your empty slots into{' '}
            <span className="text-primary">
              recurring revenue
            </span>
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From shared kitchens to food truck parks, Vendibook provides the 
            compliance, payments, and booking tools you need to run on autopilot.
          </p>

          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              variant="dark-shine"
              size="lg"
              className="h-12 px-8 text-base"
              onClick={handleStartListing}
            >
              Start My Free Listing
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              No credit card required
            </p>
          </div>
        </motion.div>

        {/* Feature Grid - The "What You Get" Section */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {featureCards.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </motion.div>

        {/* Pricing / Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">
                    Simple, success-based pricing
                  </h3>
                  <p className="text-muted-foreground">
                    It costs $0 to list your facility. We only earn a small platform fee when we successfully bring you a paid, verified booking.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground">Free to create profile & list</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground">Pay only when you earn</span>
                    </div>
                  </div>
                </div>
                
                {/* Trust Badges */}
                <div className="shrink-0">
                  <div className="flex flex-wrap lg:flex-col gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Verified Hosts</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Host Protection</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Growing Demand</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Final CTA */}
        <motion.div 
          className="text-center space-y-4 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h3 className="text-xl font-semibold text-foreground">
            Ready to professionalize your bookings?
          </h3>
          <Button
            variant="dark-shine"
            size="lg"
            className="h-12 px-8"
            onClick={handleStartListing}
          >
            Create Listing Now
          </Button>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {mode !== 'choose' && <span className="text-sm">Back to options</span>}
            </button>
            <h1 className="font-semibold">Vendibook Hosts</h1>
            <div className="w-16" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex gap-8">
          <DraftsSidebar />
          <div className="flex-1 max-w-3xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Features
const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <Card className="group hover:border-primary/40 transition-colors">
    <CardContent className="p-5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </CardContent>
  </Card>
);

export default ListPage;
