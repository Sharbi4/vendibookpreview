import { MessageCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import TicketFormDialog from './home/TicketFormDialog';

const HIDDEN_ROUTES = ['/help', '/faq', '/list-with-vendi', '/list/vendi'];

const FloatingConciergeButton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const location = useLocation();

  // Minimized by default everywhere; expanded only on /contact
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window === 'undefined') return true;
    return location.pathname !== '/contact';
  });

  useEffect(() => {
    // Sync minimization state when route changes
    setIsMinimized(location.pathname !== '/contact');
  }, [location.pathname]);

  const isHiddenRoute = HIDDEN_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  const handleClick = () => {
    const tawk = (window as any).Tawk_API;
    if (tawk?.showWidget) {
      try { tawk.showWidget(); } catch (e) { console.debug('Tawk showWidget:', e); }
    }
    if (tawk?.maximize) {
      try {
        tawk.maximize();
        return;
      } catch (error) {
        console.debug('Tawk maximize:', error);
      }
    }
    // Fallback: open ticket form if Tawk isn't loaded yet
    setIsTicketOpen(true);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    const tawk = (window as any).Tawk_API;
    if (tawk?.minimize) {
      try { tawk.minimize(); } catch (e) { console.debug('Tawk minimize:', e); }
    }
    // Give Tawk.to time to animate closed, then hide the native widget
    setTimeout(() => {
      if (tawk?.hideWidget) {
        try { tawk.hideWidget(); } catch (e) { console.debug('Tawk hideWidget:', e); }
      }
    }, 400);
  };

  if (isHiddenRoute) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50"
      >
        {isMinimized ? (
          <motion.button
            onClick={() => setIsMinimized(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Open concierge chat"
            className="relative flex items-center justify-center w-12 h-12 rounded-full cursor-pointer border-none outline-none"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(140,190,255,0.4) 50%, rgba(210,170,255,0.32) 100%)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.55), 0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            <MessageCircle className="w-5 h-5 text-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-white/50">
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            </span>
          </motion.button>
        ) : (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
              aria-label="Minimize concierge"
              className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-foreground" />
            </button>
            <motion.button
              onClick={handleClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative flex items-center gap-2 px-5 h-14 cursor-pointer border-none outline-none"
              animate={{
                borderRadius: [
                  '62% 38% 55% 45% / 42% 58% 42% 58%',
                  '45% 55% 38% 62% / 58% 42% 55% 45%',
                  '38% 62% 48% 52% / 45% 55% 58% 42%',
                  '55% 45% 62% 38% / 52% 48% 42% 58%',
                  '62% 38% 55% 45% / 42% 58% 42% 58%',
                ],
                scale: [1, 1.04, 0.97, 1.03, 1],
                rotate: [0, 1.5, -1, 0.8, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(140,190,255,0.4) 18%, rgba(255,150,200,0.35) 36%, rgba(160,255,210,0.3) 54%, rgba(255,200,140,0.38) 72%, rgba(210,170,255,0.32) 90%)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                boxShadow: `inset 0 4px 12px rgba(255,255,255,0.55), inset 0 -4px 10px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.1), ${isHovered ? '0 0 20px rgba(160,200,255,0.3)' : ''}`,
              }}
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-foreground" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-white/50">
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                </span>
              </div>
              <span className="text-foreground font-semibold text-sm">
                Ask a Human
              </span>
            </motion.button>
          </div>
        )}
      </motion.div>

      <TicketFormDialog open={isTicketOpen} onOpenChange={setIsTicketOpen} />
    </>
  );
};

export default FloatingConciergeButton;
