import { Sparkles } from 'lucide-react';

const AnnouncementBanner = () => {
  return (
    <div className="w-full bg-muted border-b border-border py-2.5 px-4">
      <div className="container max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary via-amber-400 to-yellow-300 shadow-sm text-xs font-bold text-white uppercase tracking-wide">
          <Sparkles className="w-3 h-3" />
          New
        </span>
        <span className="font-medium text-foreground text-sm md:text-base">
          Accepting payments in person or through our secure platform!
        </span>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
