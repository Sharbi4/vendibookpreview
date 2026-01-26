import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  PenLine, 
  Shield, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Star,
  ChevronRight,
  FileEdit,
  ImageIcon,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
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

type ListingMode = 'choose' | 'scratch';

const benefits = [
  { icon: DollarSign, text: 'Earn $500-2,000/week', subtext: 'Average host earnings' },
  { icon: Shield, text: 'Secure payments', subtext: 'Stripe-powered escrow' },
  { icon: Clock, text: 'List in 5 minutes', subtext: 'AI-assisted creation' },
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

  // Scroll to top when mode changes (user starts import or scratch wizard)
  useEffect(() => {
    if (mode !== 'choose') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    if (mode === 'scratch') {
      // Double-check auth before rendering wizard
      if (!user) {
        navigate('/auth?redirect=/list');
        return null;
      }
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
          {/* Create a Free Listing option */}
          <div
            className="overflow-hidden rounded-2xl border-0 shadow-xl bg-card cursor-pointer transition-all hover:shadow-2xl group"
            onClick={() => {
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
            }}
          >
            {/* Header */}
            <div className="bg-muted/30 border-b border-border px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg">
                  <PenLine className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">Create a Free Listing</p>
                  <p className="text-sm text-muted-foreground">
                    1 step closer to publishing your first live listing
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </div>
            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Our guided wizard helps you create a professional listing
              </p>
            </div>
          </div>
        </motion.div>


        {/* Trust indicators */}
        <motion.div 
          className="overflow-hidden rounded-2xl border-0 shadow-md bg-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="px-5 py-4">
            <div className="flex items-center justify-center gap-6 text-xs">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">Verified hosts</span>
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                <Star className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">5-star reviews</span>
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
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
