import { Sparkles } from 'lucide-react';

const AnnouncementBanner = () => {
  return (
    <div className="w-full bg-muted border-b border-border py-2.5 px-4 min-h-[44px]">
      <div className="container max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-foreground via-foreground/90 to-foreground text-background shadow-lg text-xs font-bold uppercase tracking-wide">
          <Sparkles className="w-3 h-3" />
          New
        </span>
        <span className="font-medium text-foreground text-sm md:text-base">
          Accept payments in-person or through our secure platform.
        </span>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
