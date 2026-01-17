import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import {
  Copy,
  Download,
  Link2,
  Check,
  Eye,
  MousePointerClick,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Platform icons as simple SVG components (monochrome)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TEMPLATES = {
  short: (title: string, city: string) =>
    `Now available on Vendibook: ${title} in ${city}. Check dates + request to book here: [Short Link]`,
  long: (assetType: string) =>
    `Hosting my ${assetType} on Vendibook. Verified renters, secure payments, and flexible pickup/delivery. View availability + request to book: [Short Link]`,
};

const ASSET_TILES = [
  { id: 'square', label: 'Square Post (1:1)', description: 'Perfect for feed posts' },
  { id: 'story', label: 'Story/Reel (9:16)', description: 'Vertical format' },
  { id: 'flyer', label: 'Flyer (PDF)', description: 'Printable asset' },
];

const BuiltInShareKit = () => {
  const [captionTemplate, setCaptionTemplate] = useState<'short' | 'long'>('short');
  const [caption, setCaption] = useState(TEMPLATES.short('[Your Listing Title]', '[City]'));
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Demo placeholder values
  const demoTitle = 'Your Listing Title';
  const demoCity = 'Los Angeles';
  const demoAssetType = 'Food Truck';

  const handleTemplateChange = (template: 'short' | 'long') => {
    setCaptionTemplate(template);
    if (template === 'short') {
      setCaption(TEMPLATES.short(demoTitle, demoCity));
    } else {
      setCaption(TEMPLATES.long(demoAssetType));
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText('https://vendibook.com/listing/your-listing');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: 'Link copied!' });
    trackEventToDb('copy_link', 'share_kit');
  };

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    toast({ title: 'Caption copied!' });
    trackEventToDb('copy_caption', 'share_kit');
  };

  const handleShareClick = (platform: string) => {
    trackEventToDb('share_click', 'share_kit', { platform });
    
    // On mobile, try native share
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator.share({
        title: `${demoTitle} on Vendibook`,
        text: caption,
        url: 'https://vendibook.com/listing/your-listing',
      }).catch(() => {
        // Fallback to URL if share is cancelled
        openShareUrl(platform);
      });
    } else {
      openShareUrl(platform);
    }
  };

  const openShareUrl = (platform: string) => {
    const listingUrl = encodeURIComponent('https://vendibook.com/listing/your-listing');
    const text = encodeURIComponent(caption);
    
    const urls: Record<string, string> = {
      tiktok: 'https://www.tiktok.com/upload',
      instagram: 'https://www.instagram.com/',
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${listingUrl}&quote=${text}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${listingUrl}`,
    };
    
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const handleAssetDownload = (type: string) => {
    trackEventToDb('asset_download', 'share_kit', { type });
    toast({ title: `${type} download started`, description: 'Asset will be ready shortly.' });
  };

  const platformButtons = [
    { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, hoverColor: 'hover:text-[#000000]' },
    { id: 'instagram', label: 'Instagram', icon: InstagramIcon, hoverColor: 'hover:text-[#E4405F]' },
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon, hoverColor: 'hover:text-[#1877F2]' },
    { id: 'x', label: 'X', icon: XIcon, hoverColor: 'hover:text-[#000000]' },
  ];

  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent max-w-5xl mx-auto overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: Copy + Actions */}
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Built-in Share Kit
                  </h2>
                  <p className="text-muted-foreground">
                    Share your listing in one tap to get more qualified renters (or buyers).
                  </p>
                </div>

                {/* Platform Share Buttons */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Share to</p>
                  <div className="flex flex-wrap gap-2">
                    {platformButtons.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => handleShareClick(platform.id)}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-muted-foreground transition-all",
                          platform.hoverColor,
                          "hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <platform.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{platform.label}</span>
                      </button>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-auto py-2.5"
                      onClick={handleCopyLink}
                    >
                      {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                      {copiedLink ? 'Copied' : 'Copy link'}
                    </Button>
                  </div>
                </div>

                {/* Caption Templates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Caption</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTemplateChange('short')}
                        className={cn(
                          "px-3 py-1 text-xs rounded-md transition-all",
                          captionTemplate === 'short'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        Short
                      </button>
                      <button
                        onClick={() => handleTemplateChange('long')}
                        className={cn(
                          "px-3 py-1 text-xs rounded-md transition-all",
                          captionTemplate === 'long'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        Detailed
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCaption}
                    className="w-full"
                  >
                    {copiedCaption ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copiedCaption ? 'Caption copied!' : 'Copy caption'}
                  </Button>
                </div>

                {/* Quality-first microcopy */}
                <p className="text-xs text-muted-foreground">
                  Quality-first marketplace: verified profiles + required documents help keep requests legitimate.
                </p>
              </div>

              {/* Right: Preview Mock */}
              <div className="bg-muted/30 p-6 md:p-8 border-t md:border-t-0 md:border-l border-border space-y-6">
                {/* Preview Listing Card Mock */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Preview</p>
                  <div className="bg-background rounded-xl border border-border p-4 space-y-3 shadow-sm">
                    <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Eye className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-xs">Your listing photo</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{demoTitle}</p>
                      <p className="text-xs text-muted-foreground">{demoCity}, CA</p>
                    </div>
                  </div>
                </div>

                {/* Asset Tiles */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Downloadable assets</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ASSET_TILES.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleAssetDownload(asset.label)}
                        className="group p-3 rounded-lg border border-border bg-background hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                      >
                        <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center">
                          <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{asset.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini Metrics Panel */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Share performance</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-background rounded-lg border border-border p-3 text-center">
                      <MousePointerClick className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-lg font-semibold text-foreground">—</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <div className="bg-background rounded-lg border border-border p-3 text-center">
                      <Eye className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-lg font-semibold text-foreground">—</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                    <div className="bg-background rounded-lg border border-border p-3 text-center">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-lg font-semibold text-foreground">—</p>
                      <p className="text-xs text-muted-foreground">Inquiries</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default BuiltInShareKit;
