import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const RequestAssetCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center">
      <h3 className="text-base font-semibold text-foreground mb-1">Don't see what you need?</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Let us know and we'll notify you when matching listings are posted.
      </p>
      <Button 
        variant="outline" 
        onClick={() => navigate('/contact?type=request')}
        className="gap-2"
      >
        <Bell className="h-4 w-4" />
        Get Notified
      </Button>
    </div>
  );
};

export default RequestAssetCTA;
