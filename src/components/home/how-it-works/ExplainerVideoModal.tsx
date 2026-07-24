import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AnimatedExplainer } from './AnimatedExplainer';
import { VideoEndCTA } from './VideoEndCTA';
import type { Explainer } from './data/explainers';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  explainer: Explainer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExplainerVideoModal = ({ explainer, open, onOpenChange }: Props) => {
  const [ended, setEnded] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (open && explainer) {
      setEnded(false);
      trackLeadEvent('homepage_video_started', { video_type: explainer.id });
    }
  }, [open, explainer, replayKey]);

  const handleProgress = (pct: number) => {
    if (!explainer) return;
    if (pct === 0.25) trackLeadEvent('homepage_video_25_percent', { video_type: explainer.id });
    if (pct === 0.5) trackLeadEvent('homepage_video_50_percent', { video_type: explainer.id });
    if (pct === 0.75) trackLeadEvent('homepage_video_75_percent', { video_type: explainer.id });
    if (pct === 1) trackLeadEvent('homepage_video_completed', { video_type: explainer.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        {explainer && (
          <>
            <DialogTitle className="sr-only">{explainer.title}</DialogTitle>
            <div className="relative">
              <AnimatedExplainer
                key={replayKey}
                explainer={explainer}
                storageKey={`vb-explainer-pos-${explainer.id}`}
                onProgress={handleProgress}
                onEnded={() => setEnded(true)}
              />
              {ended && (
                <VideoEndCTA
                  explainer={explainer}
                  onReplay={() => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem(`vb-explainer-pos-${explainer.id}`);
                    }
                    setEnded(false);
                    setReplayKey((k) => k + 1);
                  }}
                  onClose={() => onOpenChange(false)}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExplainerVideoModal;
