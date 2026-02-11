import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Plus, UserPlus, Info, Search,
  LayoutDashboard, MessageSquare, HelpCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import vendibookLogo from '@/assets/vendibook-logo.png';

interface AppDropdownMenuProps {
  variant?: 'light' | 'dark';
  className?: string;
}

const AppDropdownMenu = ({ variant = 'dark', className = '' }: AppDropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const handleClose = () => setIsOpen(false);

  const handleSignOut = async () => {
    handleClose();
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  const triggerClasses = variant === 'dark'
    ? 'p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors'
    : 'p-2 rounded-xl bg-foreground/5 border border-border text-foreground hover:bg-foreground/10 transition-colors';

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`${triggerClasses} ${className}`}
        aria-label="Menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={handleClose} />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[9999] w-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
                style={{
                  top: menuPos.top,
                  right: menuPos.right,
                  background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
                }}
              >
                {/* Top shine edge */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                {/* Left shine edge */}
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/20 via-transparent to-transparent" />

                <div className="py-1.5 relative">
                  {/* Logo */}
                  <div className="flex justify-center px-2 py-1 border-b border-white/8">
                    <img 
                      src={vendibookLogo} 
                      alt="Vendibook" 
                      className="h-24 w-auto brightness-0 invert opacity-80 -my-6"
                    />
                  </div>

                  {/* Glass overlay over links */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm pointer-events-none" />
                    
                    {user ? (
                      <>
                        <Link to="/list" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <Plus className="w-4 h-4 text-white/50" /> Create a Listing
                        </Link>
                        <Link to="/dashboard" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <LayoutDashboard className="w-4 h-4 text-white/50" /> Dashboard
                        </Link>
                        <Link to="/dashboard?tab=messages" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <MessageSquare className="w-4 h-4 text-white/50" /> Messages
                        </Link>
                        <Link to="/homepage2" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <Search className="w-4 h-4 text-white/50" /> Browse All
                        </Link>
                        <Link to="/help" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <HelpCircle className="w-4 h-4 text-white/50" /> Help Center
                        </Link>
                        <Link to="/how-it-works" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <Info className="w-4 h-4 text-white/50" /> Learn More
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="relative w-full flex items-center gap-2.5 px-3.5 py-2.5 text-red-400/90 text-sm font-medium hover:bg-red-500/10 hover:text-red-300 transition-all"
                        >
                          <LogOut className="w-4 h-4 text-red-400/50" /> Log Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/auth" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <UserPlus className="w-4 h-4 text-white/50" /> Sign Up / Login
                        </Link>
                        <Link to="/list" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <Plus className="w-4 h-4 text-white/50" /> Create a Listing
                        </Link>
                        <Link to="/how-it-works" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <Info className="w-4 h-4 text-white/50" /> Learn More
                        </Link>
                        <Link to="/homepage2" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all border-b border-white/[0.04]">
                          <Search className="w-4 h-4 text-white/50" /> Browse All
                        </Link>
                        <Link to="/help" onClick={handleClose} className="relative flex items-center gap-2.5 px-3.5 py-2.5 text-white/90 text-sm font-medium hover:bg-white/8 hover:text-white transition-all">
                          <HelpCircle className="w-4 h-4 text-white/50" /> Help Center
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom shine edge */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default AppDropdownMenu;
