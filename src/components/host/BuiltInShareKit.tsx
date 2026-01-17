import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { Link2, Check, Share2 } from 'lucide-react';
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

const BuiltInShareKit = () => {
  const [copiedLink, setCopiedLink] = useState(false);

  const listingUrl = 'https://vendibook.com/listing/your-listing';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(listingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: 'Link copied!' });
    trackEventToDb('copy_link', 'share_kit');
  };

  const handleShareClick = (platform: string) => {
    trackEventToDb('share_click', 'share_kit', { platform });

    // On mobile, try native share
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator.share({
        title: 'Check out my listing on Vendibook',
        url: listingUrl,
      }).catch(() => {
        openShareUrl(platform);
      });
    } else {
      openShareUrl(platform);
    }
  };

  const openShareUrl = (platform: string) => {
    const encodedUrl = encodeURIComponent(listingUrl);
    const text = encodeURIComponent('Check out my listing on Vendibook');

    const urls: Record<string, string> = {
      tiktok: 'https://www.tiktok.com/upload',
      instagram: 'https://www.instagram.com/',
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = () => {
    trackEventToDb('share_native', 'share_kit');

    if (navigator.share) {
      navigator.share({
        title: 'Check out my listing on Vendibook',
        url: listingUrl,
      }).catch(() => {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      });
    } else {
      handleCopyLink();
    }
  };

  const platformButtons = [
    { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, hoverColor: 'hover:text-[#000000] dark:hover:text-white' },
    { id: 'instagram', label: 'Instagram', icon: InstagramIcon, hoverColor: 'hover:text-[#E4405F]' },
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon, hoverColor: 'hover:text-[#1877F2]' },
    { id: 'x', label: 'X', icon: XIcon, hoverColor: 'hover:text-[#000000] dark:hover:text-white' },
  ];

  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container">
        <Card className="border-l-4 border-l-[#FF5124] border-t border-r border-b border-border bg-gradient-to-r from-[#FF5124]/[0.03] to-transparent max-w-3xl mx-auto">
          <CardContent className="p-6 md:p-8">
            {/* Headline + Subhead */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Share your listing to social
              </h2>
              <p className="text-muted-foreground">
                Post to TikTok, Instagram, Facebook, or X to bring in renters and buyers you already trust.
              </p>
            </div>

            {/* Share buttons */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Share to</p>
              <div className="flex flex-wrap items-center gap-2">
                {platformButtons.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleShareClick(platform.id)}
                    className={cn(
                      "inline-flex items-center justify-center w-11 h-11 rounded-lg border border-border bg-background text-muted-foreground transition-all",
                      platform.hoverColor,
                      "hover:border-[#FF5124]/30 hover:bg-muted/50"
                    )}
                    aria-label={`Share to ${platform.label}`}
                  >
                    <platform.icon className="h-5 w-5" />
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleCopyLink} className="bg-primary hover:bg-primary/90">
                  {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  {copiedLink ? 'Copied!' : 'Copy listing link'}
                </Button>
                <Button variant="outline" onClick={handleNativeShare} className="md:hidden">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground pt-2">
                Sharing to your audience helps you get faster, more qualified requests.
              </p>
            </div>

            {/* Quality line */}
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Quality-first marketplace:</span>{' '}
                we review listings and monitor activity to help keep Vendibook high-trust.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default BuiltInShareKit;
