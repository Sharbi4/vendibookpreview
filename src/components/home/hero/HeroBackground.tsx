import { motion } from 'framer-motion';

const HeroBackground = () => (
  <>
    {/* Solid dark base */}
    <div className="absolute inset-0 bg-background" />
    
    {/* Subtle animated gradient orbs */}
    <motion.div
      className="absolute w-[40rem] h-[40rem] rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 60%)', filter: 'blur(120px)' }}
      animate={{
        x: ['-20%', '30%', '-10%', '-20%'],
        y: ['-10%', '20%', '-15%', '-10%'],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute w-[30rem] h-[30rem] rounded-full opacity-15"
      style={{ background: 'radial-gradient(circle, hsl(var(--foreground) / 0.1), transparent 60%)', filter: 'blur(100px)' }}
      animate={{
        x: ['40%', '-10%', '30%', '40%'],
        y: ['10%', '-10%', '25%', '10%'],
      }}
      transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
    />

    {/* Subtle grain/noise overlay */}
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
  </>
);

export default HeroBackground;
