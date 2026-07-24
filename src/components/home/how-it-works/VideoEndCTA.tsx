import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  explainer: Explainer;
  onReplay: () => void;
  onClose: () => void;
}

export const VideoEndCTA = ({ explainer, onReplay, onClose }: Props) => {
  const navigate = useNavigate();

  const handleGo = (route: string, kind: 'primary' | 'secondary') => {
    trackLeadEvent('homepage_video_cta_clicked', {
      video_type: explainer.id,
      cta_kind: kind,
      route,
    });
    onClose();
    navigate(route);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/95 px-6 text-center backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ready when you are
        </div>
        <h3 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{explainer.title}</h3>
      </motion.div>
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-3 sm:flex-row"
      >
        <Button size="lg" onClick={() => handleGo(explainer.ctaRoute, 'primary')} className="gap-2">
          {explainer.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleGo(explainer.secondaryCtaRoute, 'secondary')}
        >
          {explainer.secondaryCtaLabel}
        </Button>
      </motion.div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        type="button"
        onClick={onReplay}
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Watch again
      </motion.button>
    </motion.div>
  );
};

export default VideoEndCTA;
