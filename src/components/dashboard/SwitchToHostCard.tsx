import { useNavigate } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SwitchToHostCard = () => {
  const navigate = useNavigate();

  return (
    <Card className="border border-border shadow-md">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Switch to Hosting</h3>
            <p className="text-sm text-muted-foreground">Manage your listings</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          You have active listings. Switch to your hosting dashboard to manage requests and payouts.
        </p>

        <Button 
          onClick={() => navigate('/dashboard?view=host')} 
          className="w-full gap-2"
          size="lg"
        >
          Go to Host Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default SwitchToHostCard;
