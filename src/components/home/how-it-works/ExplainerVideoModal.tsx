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
    else if (pct === 0.5) trackLeadEvent('homepage_video_50_percent', { video_type: explainer.id });
    else if (pct === 0.75) trackLeadEvent('homepage_video_75_percent', { video_type: explainer.id });
    else if (pct === 1) trackLeadEvent('homepage_video_completed', { video_type: explainer.id });
  };

  const handleSceneChange = ({ index }: { index: number; previousIndex: number | null; total: number }) => {
    if (!explainer) return;
    trackLeadEvent('homepage_video_scene_change', { video_type: explainer.id, scene_index: index });
  };

  const handleWatched = (ms: number) => {
    if (!explainer) return;
    trackLeadEvent('homepage_video_watched_ms', { video_type: explainer.id, ms });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-screen max-w-full h-screen max-h-screen p-0 rounded-none border-0 sm:h-auto sm:max-h-[92vh] sm:w-[92vw] sm:max-w-4xl sm:rounded-lg sm:border overflow-hidden"
      >
        {explainer && (
          <>
            <DialogTitle className="sr-only">{explainer.title}</DialogTitle>
            <div className="relative flex h-full w-full flex-col">
              <div className="relative aspect-video w-full sm:aspect-[16/9]">
                <AnimatedExplainer
                  key={replayKey}
                  explainer={explainer}
                  loop={false}
                  showControls
                  respectInView={false}
                  onProgress={handleProgress}
                  onSceneChange={handleSceneChange}
                  onWatched={handleWatched}
                  onEnded={() => setEnded(true)}
                />
              </div>
              {ended && (
                <VideoEndCTA
                  explainer={explainer}
                  onReplay={() => {
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
