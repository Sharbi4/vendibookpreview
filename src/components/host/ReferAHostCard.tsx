import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Copy, Check, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Refer-a-Host: hosts share a signup link tied to their user id.
 * When a referred host subscribes to Starter+, both parties earn a credit
 * (redeemed manually by admin for now; tracked via ?ref= param at signup).
 */
export function ReferAHostCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (!user?.id) return '';
    const short = user.id.slice(0, 8);
    return `${window.location.origin}/auth?ref=${short}`;
  }, [user?.id]);

  if (!user) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Referral link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'List your space on Vendibook',
          text: 'Join Vendibook and start earning from your unused space.',
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <Card className="rounded-2xl border border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4 text-orange-500" />
          Refer a host, earn $50
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Share your link. When a referred host subscribes to Starter or higher,
          you both get a $50 credit toward Vendibook fees.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={link} className="text-xs" />
          <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={share} aria-label="Share link">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
