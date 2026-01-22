import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const RequestAssetCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border-0 shadow-xl rounded-2xl p-8 text-center max-w-2xl mx-auto">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
        <Bell className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Don't see what you need?</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Let us know and we'll notify you when matching listings are posted.
      </p>
      <Button 
        variant="dark-shine" 
        onClick={() => navigate('/contact?type=request')}
        className="gap-2 rounded-xl px-6"
      >
        <Bell className="h-4 w-4" />
        Get Notified
      </Button>
    </div>
  );
};

export default RequestAssetCTA;
