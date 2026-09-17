import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { isWalkthroughEnabled } from '@/hooks/useVideoWalkthroughs';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export default function WalkthroughCta({ listingId, conversationId, compact = false }: { listingId?: string | null; conversationId?: string; compact?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { isWalkthroughEnabled(listingId || undefined).then((v) => { setEnabled(v); if (v && listingId) trackEventToDb('walkthrough_cta_viewed','video_walkthrough',{},listingId); }); }, [listingId]);
  if (!enabled || !listingId) return null;
  const query = conversationId ? `?conversation=${encodeURIComponent(conversationId)}` : '';
  return <div className={compact ? '' : 'walkthrough-cta'}>
    <Link to={`/walkthrough/schedule/${listingId}${query}`} className={compact ? 'v2-btn-outline v2-btn-sm' : 'v2-btn-outline w-full'}>
      <Video /> Schedule {compact ? 'walkthrough' : 'a video walkthrough'}
    </Link>
    {!compact && <p>See this truck or trailer live before you travel.</p>}
  </div>;
}