import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  CreditCard, 
  Lock,
  ChevronDown,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Award,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EnhancedProfileTrustSectionProps {
  isVerified: boolean;
  stripeConnected: boolean;
  isHost: boolean;
  isOwnProfile: boolean;
}

const EnhancedProfileTrustSection = ({
  isVerified,
  stripeConnected,
  isHost,
}: EnhancedProfileTrustSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const trustItems = [
    {
      id: 'identity',
      icon: Shield,
      label: 'Identity Verified',
      status: isVerified,
      description: 'Government ID verified via secure verification',
      color: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      id: 'payouts',
      icon: CreditCard,
      label: 'Payouts Enabled',
      status: stripeConnected,
      description: 'Connected for secure payment processing',
      hideIfNotHost: true,
      color: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      id: 'secure',
      icon: Lock,
      label: 'Secure Platform',
      status: true,
      description: 'All transactions protected with dispute resolution',
      color: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
  ];

  const visibleItems = trustItems.filter(item => 
    !item.hideIfNotHost || (item.hideIfNotHost && isHost)
  );

  const completedCount = visibleItems.filter(item => item.status).length;
  const progressPercent = (completedCount / visibleItems.length) * 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-auto py-4 px-5 bg-gradient-to-r from-muted/30 to-muted/50 hover:from-muted/40 hover:to-muted/60 rounded-2xl border border-border/50 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Award className="h-5 w-5 text-primary" />
                  {completedCount === visibleItems.length && (
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                    </motion.div>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-sm font-semibold block">Trust Score</span>
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{visibleItems.length} verified
                  </span>
                </div>
                
                {/* Progress indicator */}
                <div className="hidden sm:flex items-center gap-2 ml-4">
                  <Progress value={progressPercent} className="w-24 h-2" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
              </div>
              
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </Button>
          </motion.div>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent forceMount asChild>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <motion.div 
                  className="pt-4 space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {visibleItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div 
                        key={item.id}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all',
                          item.status 
                            ? 'bg-gradient-to-r from-emerald-50/50 to-emerald-50/30 border-emerald-200 dark:from-emerald-950/20 dark:to-emerald-950/10 dark:border-emerald-900'
                            : 'bg-muted/30 border-border/50'
                        )}
                      >
                        <motion.div 
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                            item.status ? item.iconBg : 'bg-muted'
                          )}
                          whileHover={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.3 }}
                        >
                          <Icon 
                            className={cn(
                              'h-6 w-6',
                              item.status 
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            )} 
                          />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{item.label}</span>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                            >
                              {item.status ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </motion.div>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Learn More Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <motion.div whileHover={{ scale: 1.02 }}>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5">
                          Learn more about trust & safety
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          Trust & Safety
                        </DialogTitle>
                        <DialogDescription>
                          How we keep the marketplace safe
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <h4 className="font-medium text-sm mb-1">Identity Verification</h4>
                          <p className="text-sm text-muted-foreground">
                            Users can verify their identity through secure verification, 
                            checking government-issued IDs to confirm identity.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <h4 className="font-medium text-sm mb-1">Secure Payments</h4>
                          <p className="text-sm text-muted-foreground">
                            All payments are processed securely, providing industry-leading 
                            security and fraud protection.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <h4 className="font-medium text-sm mb-1">Dispute Resolution</h4>
                          <p className="text-sm text-muted-foreground">
                            If issues arise, our support team helps mediate disputes and 
                            can process refunds when appropriate.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  );
};

export default EnhancedProfileTrustSection;
