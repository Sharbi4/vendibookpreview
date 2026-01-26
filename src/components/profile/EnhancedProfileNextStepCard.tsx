import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  CreditCard, 
  FileEdit, 
  MessageSquare, 
  PlusSquare,
  ChevronRight,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NextStepConfig {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  actionOnClick?: () => void;
  priority: number;
  gradient: string;
  iconBg: string;
}

interface EnhancedProfileNextStepCardProps {
  isVerified: boolean;
  stripeConnected: boolean;
  isHost: boolean;
  draftCount: number;
  pendingRequestCount: number;
  isLoadingStripe?: boolean;
  onConnectStripe?: () => void;
  isConnectingStripe?: boolean;
}

const EnhancedProfileNextStepCard = ({
  isVerified,
  stripeConnected,
  isHost,
  draftCount,
  pendingRequestCount,
  isLoadingStripe,
  onConnectStripe,
  isConnectingStripe,
}: EnhancedProfileNextStepCardProps) => {
  const allSteps: NextStepConfig[] = [
    {
      id: 'verify',
      icon: Shield,
      title: 'Verify your identity',
      description: 'Build trust with renters and hosts by verifying your identity.',
      actionLabel: 'Verify Now',
      actionHref: '/identity-verification',
      priority: 1,
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      id: 'stripe',
      icon: CreditCard,
      title: 'Connect Stripe to get paid',
      description: 'Set up payouts so you can receive payments for your listings.',
      actionLabel: 'Connect Stripe',
      actionOnClick: onConnectStripe,
      priority: 2,
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      id: 'drafts',
      icon: FileEdit,
      title: `Complete your draft${draftCount > 1 ? 's' : ''}`,
      description: `You have ${draftCount} unpublished listing${draftCount > 1 ? 's' : ''} ready to launch.`,
      actionLabel: 'View Drafts',
      actionHref: '/dashboard',
      priority: 3,
      gradient: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
    {
      id: 'requests',
      icon: MessageSquare,
      title: 'Respond to booking requests',
      description: `${pendingRequestCount} pending request${pendingRequestCount > 1 ? 's' : ''} waiting for your response.`,
      actionLabel: 'View Requests',
      actionHref: '/dashboard',
      priority: 4,
      gradient: 'from-violet-500 to-purple-500',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    },
    {
      id: 'create',
      icon: PlusSquare,
      title: 'Create your first listing',
      description: 'Start earning by listing your food truck, trailer, or kitchen.',
      actionLabel: 'Create Listing',
      actionHref: '/create',
      priority: 5,
      gradient: 'from-pink-500 to-rose-500',
      iconBg: 'bg-pink-100 dark:bg-pink-900/50',
    },
  ];

  const getApplicableStep = (): NextStepConfig | null => {
    if (!isVerified) return allSteps.find(s => s.id === 'verify')!;
    if (isHost && !stripeConnected && !isLoadingStripe) return allSteps.find(s => s.id === 'stripe')!;
    if (draftCount > 0) return allSteps.find(s => s.id === 'drafts')!;
    if (pendingRequestCount > 0) return allSteps.find(s => s.id === 'requests')!;
    if (!isHost) return allSteps.find(s => s.id === 'create')!;
    return null;
  };

  const step = getApplicableStep();
  if (!step) return null;

  const Icon = step.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg"
      >
        {/* Animated gradient background */}
        <motion.div 
          className={cn(
            'absolute inset-0 opacity-10 bg-gradient-to-br',
            step.gradient
          )}
          animate={{ 
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Decorative sparkle */}
        <motion.div 
          className="absolute top-3 right-3"
          animate={{ 
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="h-5 w-5 text-primary/30" />
        </motion.div>

        <div className="relative p-5 md:p-6">
          <div className="flex items-center gap-4 md:gap-5">
            {/* Animated icon container */}
            <motion.div 
              className={cn(
                'flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg',
                step.iconBg
              )}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Icon className={cn('h-7 w-7 md:h-8 md:w-8 bg-gradient-to-br bg-clip-text', step.gradient.replace('from-', 'text-').split(' ')[0])} />
              </motion.div>
            </motion.div>

            <div className="flex-1 min-w-0">
              <motion.h3 
                className="font-bold text-foreground text-base md:text-lg mb-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {step.title}
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground line-clamp-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {step.description}
              </motion.p>
            </div>

            {step.actionHref ? (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className={cn(
                    'flex-shrink-0 rounded-xl shadow-lg gap-2',
                    `bg-gradient-to-r ${step.gradient} hover:opacity-90`
                  )} 
                  asChild
                >
                  <Link to={step.actionHref}>
                    {step.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className={cn(
                    'flex-shrink-0 rounded-xl shadow-lg gap-2',
                    `bg-gradient-to-r ${step.gradient} hover:opacity-90`
                  )}
                  onClick={step.actionOnClick}
                  disabled={isConnectingStripe}
                >
                  {isConnectingStripe ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      {step.actionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedProfileNextStepCard;
