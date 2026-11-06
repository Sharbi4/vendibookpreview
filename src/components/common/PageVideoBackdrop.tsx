import { useReducedMotion } from 'framer-motion';
import './page-video-backdrop.css';

interface PageVideoBackdropProps {
  videoUrl: string;
  posterUrl: string;
}

/**
 * Muted looping background clip for light page headers using owner-selected
 * media. Sits behind content under a warm-white wash so
 * dark text stays readable. Reduced-motion users get the still photo only.
 * Parent must be `position: relative` with content above (z-index ≥ 1).
 */
const PageVideoBackdrop = ({ videoUrl, posterUrl }: PageVideoBackdropProps) => {
  const reduced = useReducedMotion();
  return (
    <div className="pvb" aria-hidden="true">
      <img className="pvb-media" src={posterUrl} alt="" loading="eager" />
      {!reduced && (
        <video className="pvb-media" src={videoUrl} poster={posterUrl} autoPlay muted loop playsInline preload="metadata" />
      )}
      <div className="pvb-wash" />
    </div>
  );
};

export default PageVideoBackdrop;
