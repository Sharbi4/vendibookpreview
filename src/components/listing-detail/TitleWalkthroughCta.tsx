import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { isWalkthroughEnabled } from '@/hooks/useVideoWalkthroughs';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

/**
 * Premium "Schedule a walkthrough" action shown to the right of the listing
 * title. Renders nothing unless the listing is published with video
 * walkthroughs enabled. Owners see their Edit control instead.
 */
export default function TitleWalkthroughCta({ listingId }: { listingId?: string | null }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    isWalkthroughEnabled(listingId || undefined).then((v) => {
      if (!alive) return;
      setEnabled(v);
      if (v && listingId) {
        trackEventToDb('walkthrough_cta_viewed', 'video_walkthrough', { placement: 'title' }, listingId);
      }
    });
    return () => {
      alive = false;
    };
  }, [listingId]);

  if (!enabled || !listingId) return null;

  return (
    <Link
      to={`/walkthrough/schedule/${listingId}`}
      className="v2-btn v2-btn-sm ml-auto shrink-0"
      aria-label="Schedule a live video walkthrough with the seller"
    >
      <Video />
      Schedule a walkthrough
    </Link>
  );
}
