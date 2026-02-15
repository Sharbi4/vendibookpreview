import { Sparkles } from 'lucide-react';

const AnnouncementBanner = () => {
  return (
    <div className="w-full border-b border-border/50 py-2.5 px-4 bg-background/80 backdrop-blur-sm">
      <div className="container max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/10 text-foreground text-[10px] font-semibold uppercase tracking-wider">
          <Sparkles className="w-2.5 h-2.5" />
          New
        </span>
        <span className="text-muted-foreground text-sm">
          Accept payments in-person or through our secure platform.
        </span>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
