import { motion } from 'framer-motion';

const HeroBackground = () => (
  <>
    {/* Solid dark base */}
    <div className="absolute inset-0 bg-background" />

    {/* Subtle grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }}
    />

    {/* Radial fade so grid fades at edges */}
    <div
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, hsl(var(--background)) 100%)',
      }}
    />

    {/* Refined warm glow — subtle, premium */}
    <motion.div
      className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(255,81,36,0.035) 0%, rgba(255,186,8,0.012) 40%, transparent 70%)',
        filter: 'blur(80px)',
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2.5, ease: 'easeOut' }}
    />

    {/* Slow ambient drift — warm */}
    <motion.div
      className="absolute w-[40rem] h-[40rem] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,81,36,0.018) 0%, transparent 55%)',
        filter: 'blur(70px)',
      }}
      animate={{
        x: ['-10%', '15%', '-5%', '-10%'],
        y: ['-5%', '10%', '-8%', '-5%'],
      }}
      transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Slow ambient drift — cool */}
    <motion.div
      className="absolute w-[30rem] h-[30rem] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 55%)',
        filter: 'blur(60px)',
      }}
      animate={{
        x: ['20%', '-15%', '12%', '20%'],
        y: ['5%', '-10%', '8%', '5%'],
      }}
      transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
    />
  </>
);

export default HeroBackground;
