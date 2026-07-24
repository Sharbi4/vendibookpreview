import { useState } from 'react';
import { Share2, Copy, Check, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SharePopoverProps {
  url: string;
  title?: string;
  text?: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outline';
  label?: string;
  className?: string;
}

/**
 * One consistent share affordance used for listings, favorites, referral, etc.
 * - Native share when available.
 * - Falls back to copy + SMS + email options.
 */
const SharePopover = ({
  url,
  title,
  text,
  size = 'sm',
  variant = 'outline',
  label,
  className,
}: SharePopoverProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const absoluteUrl = (() => {
    try {
      return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://vendibook.com').toString();
    } catch {
      return url;
    }
  })();

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    try {
      await navigator.share({ url: absoluteUrl, title, text });
      setOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast({ title: 'Link copied' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", variant: 'destructive' });
    }
  };

  const handleTrigger = async (e: React.MouseEvent) => {
    // Try native first on mobile; if unavailable, open popover.
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      e.preventDefault();
      const ok = await handleNativeShare();
      if (ok) return;
    }
  };

  const smsHref = `sms:?&body=${encodeURIComponent(`${text ?? title ?? 'Check this out'} ${absoluteUrl}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(title ?? 'Sharing this with you')}&body=${encodeURIComponent(`${text ?? ''}\n\n${absoluteUrl}`)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={handleTrigger}
          className={cn('gap-1.5', className)}
        >
          <Share2 className="h-3.5 w-3.5" />
          {label ?? 'Share'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted text-left"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Copied!' : 'Copy link'}</span>
        </button>
        <a
          href={smsHref}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Share via SMS</span>
        </a>
        <a
          href={mailHref}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted"
        >
          <Mail className="h-4 w-4" />
          <span>Share via email</span>
        </a>
      </PopoverContent>
    </Popover>
  );
};

export default SharePopover;
