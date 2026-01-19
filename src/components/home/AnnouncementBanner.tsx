import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const AnnouncementBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-gradient-to-r from-vendibook-orange via-amber-400 to-yellow-300 py-2.5 px-4">
      <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Sparkles className="w-4 h-4 text-white shrink-0" />
          <span className="text-sm font-semibold text-white">
            <span className="hidden sm:inline">NEW: </span>Accept payments in person or on our secure platform for protection!
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/list')}
          className="bg-white text-vendibook-orange hover:bg-white/90 font-semibold text-xs px-4 py-1 h-7"
        >
          Create Listing
        </Button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
