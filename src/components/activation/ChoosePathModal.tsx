import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

interface ChoosePathModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChoosePathModal = ({ isOpen, onClose }: ChoosePathModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePathSelect = async (path: 'demand' | 'supply') => {
    setIsSubmitting(true);
    
    // Track path selection
    trackEvent({
      category: 'Activation',
      action: 'path_selected',
      label: path,
    });
    
    // Mark modal as seen
    localStorage.setItem('choose_path_shown_at', new Date().toISOString());

    // Store selection in localStorage for routing
    localStorage.setItem('user_path_preference', path);

    // If user is logged in, add role
    if (user) {
      const role = path === 'supply' ? 'host' : 'shopper';
      try {
        // Check if role already exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', role)
          .single();

        if (!existingRole) {
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role });
        }
      } catch (error) {
        console.error('Error adding role:', error);
      }
    }

    setIsSubmitting(false);
    onClose();
    
    // Route based on selection
    if (path === 'demand') {
      navigate('/search');
    } else {
      navigate('/list');
    }
  };

  if (!isOpen) return null;

  const handleDismiss = () => {
    // Mark as seen when dismissed
    localStorage.setItem('choose_path_shown_at', new Date().toISOString());
    onClose();
    // Route to search by default when dismissed
    navigate('/search');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            What are you here to do?
          </h2>
          <p className="text-muted-foreground text-center text-sm mb-8">
            We'll take you to the right place.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handlePathSelect('demand')}
              disabled={isSubmitting}
              className="w-full p-5 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Browse listings</p>
                <p className="text-sm text-muted-foreground">Find trucks, trailers, kitchens & lots</p>
              </div>
            </button>

            <button
              onClick={() => handlePathSelect('supply')}
              disabled={isSubmitting}
              className="w-full p-5 rounded-xl border-2 border-border hover:border-muted-foreground hover:bg-muted/50 transition-all flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <PlusCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">List my asset</p>
                <p className="text-sm text-muted-foreground">Rent or sell your equipment</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChoosePathModal;
