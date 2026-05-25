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
    className="flex items-center justify-center gap-3 sm:gap-5"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: 0.7 }}
  >
    {SIGNALS.map(({ icon: Icon, text }, i) => (
      <motion.span
        key={text}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 hover:text-muted-foreground transition-colors duration-300 cursor-default"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 + i * 0.08 }}
        whileHover={{ scale: 1.05 }}
      >
        <Icon className="w-3 h-3" />
        {text}
      </motion.span>
    ))}
  </motion.div>
);

export default HeroTrustSignals;
