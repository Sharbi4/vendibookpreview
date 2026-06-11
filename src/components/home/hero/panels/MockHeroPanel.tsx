import { useNavigate } from 'react-router-dom';
import { trackLeadEvent } from '@/lib/leadTracking';

export interface MockCta {
  /** Top in % of visible (cropped) image height */
  top: number;
  left: number;
  width: number;
  height: number;
  href: string;
  label: string;
  event?: string;
}

interface Props {
  imageUrl: string;
  alt: string;
  ctas: MockCta[];
  /**
   * Y-pixel in the original 941x1672 image where the visible area should END.
   * Used to crop the next-section teaser baked into each mockup so the rotator
   * dots don't overlap unrelated content. Defaults to 1672 (no bottom crop).
   */
  visibleBottomPx?: number;
}

// Native image dimensions (all hero mocks are exported at this size).
const NATIVE_WIDTH = 941;
const NATIVE_HEIGHT = 1672;
// Top crop: site header baked into each mockup that we hide behind the real header.
const TOP_CROP_PX = 140;

/**
 * Renders an uploaded hero mockup image edge-to-edge with the baked-in
 * header cropped from the top and the next-section teaser cropped from the
 * bottom. CTA hot-zones overlay as transparent buttons so links keep working.
 */
const MockHeroPanel = ({ imageUrl, alt, ctas, visibleBottomPx = NATIVE_HEIGHT }: Props) => {
  const navigate = useNavigate();
  const visibleHeight = visibleBottomPx - TOP_CROP_PX;
  const aspectRatio = `${NATIVE_WIDTH} / ${visibleHeight}`;
  const topOffsetPct = -(TOP_CROP_PX / visibleHeight) * 100;

  return (
    <div className="relative w-full overflow-hidden bg-background mx-auto max-w-[480px] sm:max-w-[520px] md:max-w-[560px]">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio }}>
        <img
          src={imageUrl}
          alt={alt}
          className="absolute left-0 w-full select-none pointer-events-none"
          style={{ top: `${topOffsetPct}%` }}
          draggable={false}
        />
        {ctas.map((c) => (
          <button
            key={c.label}
            type="button"
            aria-label={c.label}
            onClick={() => {
              if (c.event) trackLeadEvent(c.event as any, { source: 'home_hero', route: '/' });
              if (c.href.startsWith('http')) window.location.href = c.href;
              else navigate(c.href);
            }}
            className="absolute rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            style={{
              top: `${c.top}%`,
              left: `${c.left}%`,
              width: `${c.width}%`,
              height: `${c.height}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MockHeroPanel;
