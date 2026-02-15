import { motion } from 'framer-motion';

const HeroBackground = () => (
  <>
    {/* Animated background orbs */}
    <motion.div
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/[0.07] rounded-full blur-[150px]"
      animate={{ scale: [1, 1.1, 1], opacity: [0.07, 0.1, 0.07] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[120px]"
      animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-accent/[0.06] rounded-full blur-[100px]"
      animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
    />
    
    {/* Subtle grid */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:80px_80px]" />

    {/* Floating particles */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-primary/20"
        style={{
          left: `${15 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
        }}
        animate={{
          y: [0, -40, 0],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 4 + i,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.6,
        }}
      />
    ))}
  </>
);

export default HeroBackground;
