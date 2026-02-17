import { motion } from 'framer-motion';

const HeroBackground = () => (
  <>
    {/* Solid dark base */}
    <div className="absolute inset-0 bg-background" />

    {/* Subtle grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.04]"
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

    {/* Slow-moving ambient light */}
    <motion.div
      className="absolute w-[60rem] h-[60rem] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 50%)',
        filter: 'blur(60px)',
      }}
      animate={{
        x: ['-15%', '25%', '-5%', '-15%'],
        y: ['-10%', '15%', '-10%', '-10%'],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute w-[40rem] h-[40rem] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 50%)',
        filter: 'blur(50px)',
      }}
      animate={{
        x: ['30%', '-15%', '20%', '30%'],
        y: ['5%', '-10%', '15%', '5%'],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
    />
  </>
);

export default HeroBackground;
