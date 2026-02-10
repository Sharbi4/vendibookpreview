import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AuthWalkthrough } from '@/components/auth/AuthWalkthrough';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import vendibookLogo from '@/assets/vendibook-logo.png';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const HeroRentalSearch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) console.error('Google login error:', error);
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden bg-[#FBF8F5]">
      {/* Warm cream-to-peach base */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #FFFAF6 0%, #FFF5EE 30%, #FFEFE4 50%, #FFF5EE 70%, #FFFAF6 100%)' }} />
      
      {/* Animated warm shine sweep */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(105deg, transparent 0%, transparent 30%, rgba(255,255,255,0.9) 42%, rgba(255,237,220,0.5) 50%, rgba(255,255,255,0.9) 58%, transparent 70%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 4,
        }}
      />
      
      {/* Warm peach orb */}
      <motion.div
        className="absolute w-[35rem] h-[35rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255, 200, 160, 0.25), transparent 60%)', filter: 'blur(90px)' }}
        animate={{
          x: ['-10%', '50%', '10%', '-10%'],
          y: ['-5%', '20%', '-10%', '-5%'],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Soft coral accent orb */}
      <motion.div
        className="absolute w-[25rem] h-[25rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255, 120, 70, 0.1), transparent 60%)', filter: 'blur(80px)' }}
        animate={{
          x: ['40%', '-20%', '30%', '40%'],
          y: ['10%', '-5%', '25%', '10%'],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Logo & Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-10 md:mb-14"
        >
          <img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-56 md:h-72 w-auto mx-auto mb-6 transition-transform duration-300 hover:scale-105"
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-4">
            The Marketplace for <span className="gradient-text-warm">Food Business</span>
          </h1>
        </motion.div>

        {/* Two-Path Layout: Animation Left, CTAs Right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="grid lg:grid-cols-5 gap-6"
        >
          {/* Left: Walkthrough Animation */}
          <div className="lg:col-span-3 glass-premium rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground text-lg">Why Vendibook?</h3>
                <p className="text-xs text-muted-foreground">See how it works</p>
              </div>
            </div>
            <div className="flex-1">
              <AuthWalkthrough />
            </div>
          </div>

          {/* Right: CTA Buttons */}
          <div className="lg:col-span-2 glass-premium rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-center">
            <h3 className="font-semibold text-foreground text-lg mb-2">Get Started</h3>
            <p className="text-sm text-muted-foreground mb-6">Find or list food business assets</p>

            <div className="flex flex-col gap-4">
              <Button
                variant="dark-shine"
                size="lg"
                className="w-full h-14 text-lg rounded-xl"
                onClick={() => navigate('/search')}
              >
                Browse Listings
              </Button>

              <Button
                variant="dark-shine"
                size="lg"
                className="w-full h-14 text-lg rounded-xl"
                onClick={() => navigate('/list')}
              >
                Create a Free Listing
              </Button>

              {!user && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-lg rounded-xl bg-background hover:bg-muted/60 border-border"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  Continue with Google
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroRentalSearch;
