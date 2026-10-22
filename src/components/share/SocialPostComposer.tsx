import { useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { buildSocialCaption, type SocialPlatform, type SocialPostFacts } from '@/lib/share/socialPostCaption';

interface Props {
  platform: SocialPlatform | null;
  facts: SocialPostFacts;
  photos: string[];
  blocked?: boolean;
  onClose: () => void;
  /** Opens Facebook's sharer with the listing link (text cannot be prefilled). */
  onOpenFacebook: () => void;
  onDownloadImage: () => void;
  /** Native share with the social image when the device supports it. */
  onNativeShare?: (caption: string) => void;
  onCopied?: (platform: SocialPlatform, caption: string) => void;
}

export function SocialPostComposer({ platform, facts, photos, blocked, onClose, onOpenFacebook, onDownloadImage, onNativeShare, onCopied }: Props) {
  const [caption, setCaption] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (platform) { setCaption(buildSocialCaption(platform, facts)); setCopied(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, facts.title, facts.shareUrl]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(caption); setCopied(true); onCopied?.(platform!, caption); } catch { setCopied(false); }
  };
  const fb = platform === 'facebook';
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && !!onNativeShare;
  const uniquePhotos = [...new Set(photos.filter(Boolean))].slice(0, 6);

  return (
    <Dialog open={!!platform} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sale-light max-h-[90vh] overflow-y-auto rounded-[24px] sm:max-w-lg" style={{ background: '#fffdf9' }}>
        <DialogHeader>
          <DialogTitle>{fb ? 'Your Facebook post' : 'Your Instagram post'}</DialogTitle>
          <DialogDescription>
            Written from your listing details. Edit anything, then copy it.{' '}
            {fb ? 'Facebook opens with your listing link; paste the caption yourself.' : 'Instagram posting happens in the Instagram app.'}
          </DialogDescription>
        </DialogHeader>

        {uniquePhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2" aria-label="Your listing photos">
            {uniquePhotos.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer" download className="aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open photo ${i + 1}`}>
                <img src={src} alt={`${facts.title} — photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}

        <label htmlFor="social-post-caption" className="text-sm font-medium">Caption</label>
        <Textarea id="social-post-caption" value={caption} onChange={(e) => { setCaption(e.target.value); setCopied(false); }} rows={9} className="text-base sm:text-sm" />

        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} disabled={blocked || !caption.trim()} className="gap-2">{copied ? <Check /> : <Copy />}{copied ? 'Caption copied' : 'Copy caption'}</Button>
          {fb ? (
            <Button variant="outline" onClick={onOpenFacebook} disabled={blocked} className="gap-2"><ExternalLink /> Open Facebook</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onDownloadImage} disabled={blocked} className="gap-2"><Download /> Save Story image</Button>
              {canNative && <Button variant="outline" onClick={() => onNativeShare!(caption)} disabled={blocked} className="gap-2"><Share2 /> Share from device</Button>}
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Nothing is posted automatically. You choose where and when to post.</p>
      </DialogContent>
    </Dialog>
  );
}

export default SocialPostComposer;
