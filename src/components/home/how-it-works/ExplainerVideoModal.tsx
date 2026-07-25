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
      // Legacy funnel event kept for continuity.
      trackLeadEvent('homepage_video_started', { video_type: explainer.id });
    }
  }, [open, explainer, replayKey]);

  const handlePlay = () => {
    if (!explainer) return;
    trackLeadEvent('video_play', { video_id: explainer.id });
  };

  const handleView = () => {
    if (!explainer) return;
    // Counts as a "view" once the viewer has watched 3+ seconds.
    trackLeadEvent('video_view', { video_id: explainer.id });
  };

  const handleProgress = (pct: number) => {
    if (!explainer) return;
    const id = explainer.id;
    if (pct === 0.25) {
      trackLeadEvent('video_progress_25', { video_id: id });
      trackLeadEvent('homepage_video_25_percent', { video_type: id });
    } else if (pct === 0.5) {
      trackLeadEvent('video_progress_50', { video_id: id });
      trackLeadEvent('homepage_video_50_percent', { video_type: id });
    } else if (pct === 0.75) {
      trackLeadEvent('video_progress_75', { video_id: id });
      trackLeadEvent('homepage_video_75_percent', { video_type: id });
    } else if (pct === 1) {
      trackLeadEvent('video_complete', { video_id: id });
      trackLeadEvent('homepage_video_completed', { video_type: id });
    }
  };

  const handleSceneChange = ({ index }: { index: number; previousIndex: number | null; total: number }) => {
    if (!explainer) return;
    trackLeadEvent('homepage_video_scene_viewed', { video_type: explainer.id, scene_index: index });
  };

  const handleReplay = () => {
    if (explainer) trackLeadEvent('video_replay', { video_id: explainer.id });
    setEnded(false);
    setReplayKey((k) => k + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen max-w-full h-screen max-h-screen p-0 rounded-none border-0 sm:h-auto sm:max-h-[92vh] sm:w-[92vw] sm:max-w-4xl sm:rounded-lg sm:border overflow-hidden">
        {explainer && (
          <>
            <DialogTitle className="sr-only">{explainer.title}</DialogTitle>
            <div className="relative flex h-full w-full flex-col">
              <div className="relative aspect-video w-full sm:aspect-[16/9]">
                <AnimatedExplainer
                  key={replayKey}
                  explainer={explainer}
                  autoPlay
                  onPlay={handlePlay}
                  onView={handleView}
                  onProgress={handleProgress}
                  onSceneChange={handleSceneChange}
                  onEnded={() => setEnded(true)}
                />
              </div>
              {ended && (
                <VideoEndCTA
                  explainer={explainer}
                  onReplay={handleReplay}
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
