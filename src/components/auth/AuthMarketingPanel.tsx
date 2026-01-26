import { motion } from 'framer-motion';
import { BadgeCheck, Shield, Zap, TrendingUp, Star, Users } from 'lucide-react';
import vendibookLogo from '@/assets/vendibook-logo.png';

interface AuthMarketingPanelProps {
  mode: 'signin' | 'signup' | 'forgot' | 'verify';
}

const testimonials = [
  {
    quote: "Listed my food truck and got my first booking within a week!",
    author: "Maria S.",
    role: "Food Truck Owner",
    rating: 5,
  },
  {
    quote: "The verified renter system gave me peace of mind.",
    author: "James K.",
    role: "Kitchen Host",
    rating: 5,
  },
  {
    quote: "Affirm financing made buying my trailer possible.",
    author: "Lisa M.",
    role: "Food Entrepreneur",
    rating: 5,
  },
];

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '$2M+', label: 'Host Earnings' },
  { value: '98%', label: 'Satisfaction Rate' },
];

const features = [
  {
    icon: Shield,
    title: 'Verified Users',
    description: 'Every renter is identity-verified for your protection',
  },
  {
    icon: Zap,
    title: 'Instant Booking',
    description: 'Get bookings instantly with our streamlined platform',
  },
  {
    icon: TrendingUp,
    title: 'Maximize Earnings',
    description: 'Turn idle assets into consistent income streams',
  },
];

export const AuthMarketingPanel = ({ mode }: AuthMarketingPanelProps) => {
  const isSignup = mode === 'signup';

  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8 lg:p-12 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
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

      {/* Features - Show on signup */}
      {isSignup && (
        <motion.div
          className="relative z-10 space-y-4 my-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="flex items-start gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Testimonial Carousel - Show on signin */}
      {!isSignup && (
        <motion.div
          className="relative z-10 my-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex gap-1 mb-3">
              {[...Array(testimonials[0].rating)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-lg text-foreground italic mb-4">
              "{testimonials[0].quote}"
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{testimonials[0].author}</p>
                <p className="text-sm text-muted-foreground">{testimonials[0].role}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
