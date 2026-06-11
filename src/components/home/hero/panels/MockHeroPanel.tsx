import { useNavigate } from 'react-router-dom';
import { trackLeadEvent } from '@/lib/leadTracking';

export interface MockCta {
  /** Top in % of visible (header-cropped) image height */
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
}

/**
 * Renders an uploaded hero mockup image edge-to-edge.
 * The site header is cropped off the top (~140 / 1672 ≈ 8.37%)
 * so the real sticky header sits seamlessly above it.
 * CTA hot-zones are overlaid as transparent buttons so links keep working.
 */
const MockHeroPanel = ({ imageUrl, alt, ctas }: Props) => {
  const navigate = useNavigate();
  // Visible image aspect = 941 x (1672 - 140) = 941 x 1532
  return (
    <div className="relative w-full overflow-hidden bg-background mx-auto max-w-[480px] sm:max-w-[520px] md:max-w-[560px]">
      <div className="relative w-full" style={{ aspectRatio: '941 / 1532' }}>
        <img
          src={imageUrl}
          alt={alt}
          className="absolute left-0 w-full select-none pointer-events-none"
          style={{ top: '-9.14%' }}
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
