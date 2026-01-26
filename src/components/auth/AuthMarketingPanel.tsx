import { motion } from 'framer-motion';
import { BadgeCheck, Shield } from 'lucide-react';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { AuthWalkthrough } from './AuthWalkthrough';

interface AuthMarketingPanelProps {
  mode: 'signin' | 'signup' | 'forgot' | 'verify';
}

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '$2M+', label: 'Host Earnings' },
  { value: '98%', label: 'Satisfaction Rate' },
];

export const AuthMarketingPanel = ({ mode }: AuthMarketingPanelProps) => {
  const isSignup = mode === 'signup';

  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full min-h-screen bg-gradient-to-br from-foreground/5 via-background to-foreground/10 p-8 lg:p-12 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-foreground/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-foreground/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Logo & Header */}
      <div className="relative z-10">
        <motion.img
          src={vendibookLogo}
          alt="Vendibook"
          className="h-16 w-auto mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {isSignup ? (
              <>
                Join the <span className="gradient-text-warm">marketplace</span> for food business
              </>
            ) : (
              <>
                Welcome back to <span className="gradient-text-warm">Vendibook</span>
              </>
            )}
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            {isSignup
              ? 'Connect with verified renters, list your assets, and grow your food business today.'
              : 'Pick up where you left off. Your listings and bookings are waiting for you.'}
          </p>
        </motion.div>
      </div>

      {/* Animated Walkthrough */}
      <motion.div
        className="relative z-10 my-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AuthWalkthrough />
      </motion.div>

      {/* Stats */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            >
              <p className="text-2xl lg:text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span>Verified Users</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>Secure Payments</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
