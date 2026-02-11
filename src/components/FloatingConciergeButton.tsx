import { MessageCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Routes where we hide the FAB (Zendesk widget shows on these)
const HIDDEN_ROUTES = ['/contact', '/help', '/faq'];

const FloatingConciergeButton = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();

  // Hide on routes where Zendesk widget is already prominent
  const isHiddenRoute = HIDDEN_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  // Always visible — no scroll gating

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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50"
        >
          <button
            onClick={openZendeskChat}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative flex items-center gap-2 h-14 rounded-full shadow-2xl shadow-primary/30 transition-all duration-300 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.9))',
            }}
          >
            {/* Glass overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            
            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            {/* Content */}
            <div className="relative flex items-center gap-2 px-5">
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
                {/* Pulse dot */}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-white/50">
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                </span>
              </div>
              
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ 
                  width: isHovered ? 'auto' : 0,
                  opacity: isHovered ? 1 : 0
                }}
                className="text-primary-foreground font-semibold text-sm whitespace-nowrap overflow-hidden"
              >
                Ask a Human
              </motion.span>
              
              {!isHovered && (
                <span className="text-primary-foreground font-semibold text-sm">
                  Ask a Human
                </span>
              )}
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingConciergeButton;
