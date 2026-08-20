import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, MessageCircle, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { formatLastActive } from '@/hooks/useActivityTracker';

interface RentalHostCardProps {
  hostId: string;
  listingId: string;
  listingTitle: string;
  hostName: string | null;
  hostAvatar?: string | null;
  isVerified?: boolean;
  memberSince?: string | null;
  lastActiveAt?: string | null;
  ratingData?: { average: number; count: number } | null;
  isOwner?: boolean;
}

/**
 * Single host surface for the rental detail page: identity, real signals only,
 * and the message form. Nothing here is repeated elsewhere on the page.
 */
export const RentalHostCard = ({
  hostId,
  listingId,
  listingTitle,
  hostName,
  hostAvatar,
  isVerified = false,
  memberSince,
  lastActiveAt,
  ratingData,
  isOwner = false,
}: RentalHostCardProps) => {
  const [showMessage, setShowMessage] = useState(false);
  const { data: responseTimeData } = useHostResponseTime(hostId);

  const name = hostName || 'Host';
  const initials = name.replace(/\.$/, '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const profileLink = hostId ? `/u/${hostId}?from_listing=${listingId}` : '#';
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;
  const lastActive = formatLastActive(lastActiveAt || null);

  const facts = [
    memberYear ? `Hosting since ${memberYear}` : null,
    lastActive || null,
    responseTimeData?.isFastResponder ? 'Usually replies quickly' : null,
  ].filter(Boolean) as string[];

  return (
    <SaleCard padding="lg" className="space-y-4">
      <h2 className="text-lg font-semibold">Meet your host</h2>

      <div className="flex items-start gap-4">
        <Link to={profileLink} className="shrink-0">
          <Avatar className="h-14 w-14 border border-border">
            <AvatarImage src={hostAvatar || undefined} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={profileLink} className="text-base font-semibold hover:text-primary transition-colors">
            {name}
          </Link>
          {isVerified && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Identity verified
            </span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {ratingData?.count ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <Star className="h-3.5 w-3.5 fill-current" />
                {ratingData.average} ({ratingData.count})
              </span>
            ) : null}
            {facts.map((f) => (
              <span key={f} className="before:content-['·'] before:mr-2 first:before:content-none first:before:mr-0">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMessage((v) => !v)}>
            <MessageCircle className="h-4 w-4 mr-1.5" />
            {showMessage ? 'Hide message' : 'Message host'}
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to={profileLink}>
              View profile
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {!isOwner && showMessage && (
        <div className="pt-1">
          <MessageHostForm listingId={listingId} hostId={hostId} listingTitle={listingTitle} />
        </div>
      )}
    </SaleCard>
  );
};

export default RentalHostCard;
