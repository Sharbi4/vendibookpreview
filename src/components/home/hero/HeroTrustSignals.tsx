import { motion } from 'framer-motion';
import { ShieldCheck, CreditCard, Zap, BadgeDollarSign } from 'lucide-react';

const SIGNALS = [
  { icon: ShieldCheck, text: 'Verified' },
  { icon: CreditCard, text: 'Secure pay' },
  { icon: Zap, text: 'Instant book' },
  { icon: BadgeDollarSign, text: 'Pay later' },
];

const HeroTrustSignals = () => (
  <motion.div
    className="flex items-center justify-center gap-4 sm:gap-6"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5, delay: 0.7 }}
  >
    {SIGNALS.map(({ icon: Icon, text }) => (
      <span key={text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="w-3 h-3 text-muted-foreground" />
        {text}
      </span>
    ))}
  </motion.div>
);

export default HeroTrustSignals;
