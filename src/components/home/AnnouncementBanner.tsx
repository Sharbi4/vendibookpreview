import { Sparkles } from 'lucide-react';

const AnnouncementBanner = () => {
  return (
    <div className="w-full border-b border-white/10 py-2.5 px-4 min-h-[44px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="container max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white shadow-lg text-xs font-bold uppercase tracking-wide">
          <Sparkles className="w-3 h-3" />
          New
        </span>
        <span className="font-medium text-white/80 text-sm md:text-base">
          Accept payments in-person or through our secure platform.
        </span>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
