import { useState, useMemo } from 'react';
import { Megaphone, Share2, TrendingUp, CheckCircle2, Loader2, Copy, Star, Facebook, Search as GoogleIcon, Instagram, Mail, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useHostListings } from '@/hooks/useHostListings';
import { usePromotionAssets, useGenerateAdCopy } from '@/hooks/usePromotionAssets';
import { toast } from '@/hooks/use-toast';
import { parseEdgeError } from '@/lib/edgeErrors';
import { usePremiumUpsell, isPremiumError, featureFromParsed } from '@/hooks/usePremiumUpsell';
import { PremiumChip } from '@/components/monetization/PremiumChip';
import { cn } from '@/lib/utils';


const CHANNELS = [
  { id: 'meta', label: 'Meta (FB+IG)', icon: Facebook, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  { id: 'google', label: 'Google Ads', icon: GoogleIcon, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600 bg-pink-500/10 border-pink-500/20' },
  { id: 'email', label: 'Email blast', icon: Mail, color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' }];

interface SeoScore {
  score: number;
  issues: string[];
  wins: string[];
}

function calcSeoScore(listing: any): SeoScore {
  const issues: string[] = [];
  const wins: string[] = [];
  let score = 100;

  if (!listing.title || listing.title.length < 30) {
    score -= 15;
    issues.push('Title under 30 chars — search engines prefer 40-60');
  } else {
    wins.push('Title length is search-friendly');
  }
  if (!listing.description || listing.description.length < 200) {
    score -= 20;
    issues.push('Description too short for organic ranking');
  } else {
    wins.push('Rich description (200+ chars)');
  }
  const imgCount = (listing.image_urls?.length || 0) + (listing.cover_image_url ? 1 : 0);
  if (imgCount < 5) {
    score -= 15;
    issues.push(`Only ${imgCount} photos — listings with 5+ get 2× more clicks`);
  } else {
    wins.push(`${imgCount} photos — strong visual appeal`);
  }
  if (!listing.video_urls?.length) {
    score -= 10;
    issues.push('No video — adds 30% engagement boost');
  } else {
    wins.push('Video included — premium signal');
  }
  if (!listing.amenities?.length) {
    score -= 10;
    issues.push('No amenities listed — hurts filter visibility');
  }
  if (!listing.highlights?.length) {
    score -= 5;
    issues.push('Missing highlights/USPs');
  }
  if (listing.featured_enabled) {
    wins.push('Featured boost active — top of results');
  }

  return { score: Math.max(0, score), issues, wins };
}

export const PromotionHub = () => {
  const { listings } = useHostListings();
  const published = listings.filter((l) => l.status === 'published');
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo(
    () => published.find((l) => l.id === selectedId) || published[0],
    [published, selectedId]
  );

  const { data: assets } = usePromotionAssets(selected?.id);
  const generate = useGenerateAdCopy();

  const seo = selected ? calcSeoScore(selected) : null;
  const premiumUpsell = usePremiumUpsell();

  const handleGenerate = async (channels: string[]) => {
    if (!selected) return;
    try {
      await generate.mutateAsync({ listing_id: selected.id, channels });
    } catch (e: any) {
      const parsed = await parseEdgeError(e);
      if (isPremiumError(parsed)) {
        premiumUpsell.show(featureFromParsed(parsed) ?? 'marketing-studio', 'promotion_hub');
      } else {
        toast({
          title: 'Could not generate copy',
          description: parsed.message || 'Please try again',
          variant: 'destructive',
        });
      }
    }
  };



  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const shareUrl = selected ? `${window.location.origin}/listing/${selected.id}` : '';

  if (published.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="py-12 text-center">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground mb-1">No published listings yet</p>
          <p className="text-xs text-muted-foreground">Publish a listing to unlock promotion tools.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Listing selector */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <Label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
            Promote which listing?
          </Label>
          <Select value={selected?.id} onValueChange={setSelectedId}>
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {published.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="boost" className="w-full">
        <TabsList className="grid grid-cols-4 w-full rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="boost" className="rounded-lg">Boost</TabsTrigger>
          <TabsTrigger value="copy" className="rounded-lg">Spark Copy</TabsTrigger>
          <TabsTrigger value="seo" className="rounded-lg">SEO</TabsTrigger>
          <TabsTrigger value="share" className="rounded-lg">Share</TabsTrigger>
        </TabsList>

        {/* BOOST */}
        <TabsContent value="boost" className="mt-4 space-y-3">
          <Card className="border border-border overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/10 p-5 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Featured Boost
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Top of search for 30 days</h3>
              <p className="text-sm text-muted-foreground mt-1">
                $30 one-time. Pin to top of category, glow in cards, weekly performance email.
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1.5">
                Extending stacks — you never lose remaining days. Rotates fairly with other Featured
                listings each day so every booster reaches the top slot.
              </p>
              <Button
                variant="dark-shine"
                className="mt-3 rounded-xl"
                onClick={() => {
                  toast({
                    title: 'Open the Listings tab',
                    description: 'Click "Boost" on the listing card to activate or extend.'});
                }}
              >
                <Zap className="h-4 w-4 mr-1.5" />
                {selected?.featured_enabled ? 'Active — extend (adds 30 days)' : 'Activate $30 boost'}
              </Button>
            </div>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribution sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Meta Catalog + CAPI</p>
                    <p className="text-xs text-muted-foreground">
                      Auto-sync to Facebook Shops & retarget viewers
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <GoogleIcon className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium">Google Merchant Center</p>
                    <p className="text-xs text-muted-foreground">
                      Show in Google Shopping & local results
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Email saved-search subscribers</p>
                    <p className="text-xs text-muted-foreground">
                      Notify users who saved this category in your area
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs">
                  Send blast
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI COPY */}
        <TabsContent value="copy" className="mt-4 space-y-3">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                
                Ready-to-post ad copy from Spark
                <PremiumChip />
              </CardTitle>

            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Button
                      key={c.id}
                      variant="outline"
                      size="sm"
                      disabled={generate.isPending}
                      onClick={() => handleGenerate([c.id])}
                      className={cn('rounded-xl h-auto py-2.5 flex-col gap-1', c.color)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{c.label}</span>
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="dark-shine"
                size="sm"
                className="w-full rounded-xl"
                disabled={generate.isPending}
                onClick={() => handleGenerate(CHANNELS.map((c) => c.id))}
              >
                {generate.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : null}
                Generate for all channels
              </Button>
            </CardContent>
          </Card>

          {assets && assets.length > 0 && (
            <div className="space-y-2">
              {assets.slice(0, 8).map((asset) => {
                const channel = CHANNELS.find((c) => c.id === asset.channel);
                const Icon = channel?.icon || Megaphone;
                const text =
                  typeof asset.content === 'string'
                    ? asset.content
                    : asset.content?.text || asset.content?.body || JSON.stringify(asset.content, null, 2);
                return (
                  <Card key={asset.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={cn('gap-1', channel?.color)}>
                          <Icon className="h-3 w-3" />
                          {channel?.label || asset.channel}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 rounded-lg"
                          onClick={() => handleCopy(text)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {asset.title && (
                        <p className="text-sm font-semibold text-foreground mb-1">{asset.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {text}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4">
          {seo && (
            <Card className="border border-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">SEO Score</CardTitle>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      seo.score >= 80
                        ? 'text-emerald-600'
                        : seo.score >= 60
                        ? 'text-amber-600'
                        : 'text-destructive'
                    )}
                  >
                    {seo.score}/100
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {seo.wins.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                      Strengths
                    </p>
                    <div className="space-y-1.5">
                      {seo.wins.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {seo.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-2">
                      Opportunities
                    </p>
                    <div className="space-y-1.5">
                      {seo.issues.map((iss, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                          {iss}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SHARE */}
        <TabsContent value="share" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Quick share
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted border border-border">
                <span className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-7 text-xs"
                  onClick={() => handleCopy(shareUrl)}
                >
                  Copy
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    )
                  }
                >
                  <Facebook className="h-4 w-4 mr-1.5" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(selected?.title || '')}`,
                      '_blank'
                    )
                  }
                >
                  Tweet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    )
                  }
                >
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    window.open(
                      `mailto:?subject=${encodeURIComponent(selected?.title || '')}&body=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    )
                  }
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {premiumUpsell.overlay}
    </div>
  );
};


export default PromotionHub;
