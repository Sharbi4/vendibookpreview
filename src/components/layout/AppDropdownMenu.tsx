import { useState } from 'react';
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
  /** Button style variant */
  variant?: 'light' | 'dark';
  /** Additional className for the trigger button */
  className?: string;
}

const AppDropdownMenu = ({ variant = 'dark', className = '' }: AppDropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClose = () => setIsOpen(false);

  const handleSignOut = async () => {
    handleClose();
    await supabase.auth.signOut();
    navigate('/');
  };

  const triggerClasses = variant === 'dark'
    ? 'p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors'
    : 'p-2 rounded-xl bg-foreground/5 border border-border text-foreground hover:bg-foreground/10 transition-colors';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${triggerClasses} ${className}`}
        aria-label="Menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[199]" onClick={handleClose} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-[calc(100%+8px)] z-[200] w-72 rounded-xl bg-gray-900 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden"
            >
              <div className="py-1.5">
                {/* Logo */}
                <div className="flex justify-center px-3 pt-1.5 pb-2 border-b border-white/10">
                  <img 
                    src={vendibookLogo} 
                    alt="Vendibook" 
                    className="h-14 w-auto brightness-0 invert opacity-80"
                  />
                </div>
                {user ? (
                  <>
                    <Link to="/list" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Plus className="w-4 h-4 text-white/70" /> Create a Listing
                    </Link>
                    <Link to="/dashboard" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <LayoutDashboard className="w-4 h-4 text-white/70" /> Dashboard
                    </Link>
                    <Link to="/dashboard?tab=messages" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <MessageSquare className="w-4 h-4 text-white/70" /> Messages
                    </Link>
                    <Link to="/homepage2" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Search className="w-4 h-4 text-white/70" /> Browse All
                    </Link>
                    <Link to="/contact" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <HelpCircle className="w-4 h-4 text-white/70" /> Help Center
                    </Link>
                    <Link to="/how-it-works" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Info className="w-4 h-4 text-white/70" /> Learn More
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-400 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-400/70" /> Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <UserPlus className="w-4 h-4 text-white/70" /> Sign Up / Login
                    </Link>
                    <Link to="/list" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Plus className="w-4 h-4 text-white/70" /> Create a Listing
                    </Link>
                    <Link to="/how-it-works" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Info className="w-4 h-4 text-white/70" /> Learn More
                    </Link>
                    <Link to="/homepage2" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Search className="w-4 h-4 text-white/70" /> Browse All
                    </Link>
                    <Link to="/contact" onClick={handleClose} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <HelpCircle className="w-4 h-4 text-white/70" /> Help Center
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppDropdownMenu;
