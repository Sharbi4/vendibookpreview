import { motion } from 'framer-motion';

const HeroBackground = () => (
  <>
    {/* Solid dark base */}
    <div className="absolute inset-0 bg-background" />
    
    {/* Subtle animated gradient orbs */}
    <motion.div
      className="absolute w-[50rem] h-[50rem] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(180,180,200,0.04) 40%, transparent 60%)', filter: 'blur(80px)' }}
      animate={{
        x: ['-20%', '30%', '-10%', '-20%'],
        y: ['-10%', '20%', '-15%', '-10%'],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute w-[35rem] h-[35rem] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(160,160,180,0.03) 40%, transparent 60%)', filter: 'blur(70px)' }}
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
