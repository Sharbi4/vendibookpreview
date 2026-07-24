import { Link } from 'react-router-dom';
import { Camera, Eye, ShieldCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import verifiedBadge from '@/assets/verified-badge.png';

interface Props {
  name: string;
  subtitle: string;
  avatarUrl?: string;
  initials: string;
  verified: boolean;
  onAvatarClick: () => void;
  isUploadingAvatar?: boolean;
  publicProfileHref: string;
}

const IdentitySummaryCard = ({
  name,
  subtitle,
  avatarUrl,
  initials,
  verified,
  onAvatarClick,
  isUploadingAvatar,
  publicProfileHref,
}: Props) => (
  <section className="rounded-lg border border-border bg-card p-5 md:p-6">
    <div className="flex items-center gap-4 md:gap-5">
      <button
        type="button"
        onClick={onAvatarClick}
        aria-label="Change profile photo"
        className="relative shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
      >
        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-border">
          <AvatarImage src={avatarUrl || undefined} alt={name} />
          <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
          {isUploadingAvatar ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">
            {name}
          </h1>
          {verified && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
              <img src={verifiedBadge} alt="" className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/70 mt-0.5 truncate">
          {subtitle}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to={publicProfileHref}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview public profile
            </Link>
          </Button>
          {!verified && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/verify-identity">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Verify identity
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  </section>
);

export default IdentitySummaryCard;
