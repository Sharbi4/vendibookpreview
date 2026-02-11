import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const HIDDEN_ROUTES = ['/contact', '/help', '/faq'];

const FloatingConciergeButton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();

  const isHiddenRoute = HIDDEN_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  const openZendeskChat = () => {
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
  };

  if (isHiddenRoute) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-6 right-6 z-50"
    >
      <motion.button
        onClick={openZendeskChat}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center gap-2 px-5 h-14"
        animate={{
          borderRadius: [
            '58% 42% 52% 48% / 46% 54% 46% 54%',
            '48% 52% 44% 56% / 54% 46% 52% 48%',
            '44% 56% 50% 50% / 48% 52% 54% 46%',
            '52% 48% 56% 44% / 52% 48% 46% 54%',
            '58% 42% 52% 48% / 46% 54% 46% 54%',
          ],
          scale: [1, 1.02, 0.99, 1.01, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.5) 0%, rgba(160,200,255,0.35) 20%, rgba(255,170,210,0.28) 40%, rgba(180,255,220,0.25) 60%, rgba(255,210,160,0.32) 80%, rgba(220,190,255,0.28) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.5), inset 0 -3px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
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
    </motion.div>
  );
};

export default FloatingConciergeButton;
