import { motion } from 'framer-motion';

const SIGNALS = ['Verified listings', 'Secure payments', 'Instant booking', 'Buy now, pay later'];

const HeroTrustSignals = () => (
  <motion.div
    className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5, delay: 0.7 }}
  >
    {SIGNALS.map((text) => (
      <span key={text} className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
        {text}
      </span>
    ))}
  </motion.div>
);

export default HeroTrustSignals;
