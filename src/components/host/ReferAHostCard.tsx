import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Copy, Check, Share2, Loader2, Mail, MessageCircle, Facebook, Twitter, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useReferralCode, useMyReferrals, buildReferralUrl } from '@/hooks/useReferral';
import { supabase } from '@/integrations/supabase/client';

/**
 * Refer-a-Host: hosts share their real referral code. Attribution runs
 * through the existing `referrals` / `referral_codes` pipeline so credits
 * are tracked automatically when the referred host subscribes to Starter+.
 */
export function ReferAHostCard() {
  const { user } = useAuth();
  const { data: refCode, isLoading } = useReferralCode();
  const { data: referrals = [] } = useMyReferrals();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const link = refCode?.code ? buildReferralUrl(refCode.code, '/auth') : '';
  const qualifiedCount = referrals.filter((r) => r.status === 'qualified').length;

  const copy = async () => {
    if (!link) return;
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
    if (!link) return;
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

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your referral link…
          </div>
        ) : link ? (
          <>
            <div className="flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={share} aria-label="Share link">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Invited" value={refCode?.total_referred ?? 0} />
              <Stat label="Qualified" value={qualifiedCount} />
              <Stat label="Earned" value={`$${(refCode?.total_earned ?? 0).toFixed(0)}`} />
            </div>
            <ShareRow link={link} />
            <EmailInviteComposer />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your referral code is being set up. Check back shortly.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-center">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ShareRow({ link }: { link: string }) {
  const text = 'List your space on Vendibook and start earning. Join with my link:';
  const enc = encodeURIComponent;
  const targets = [
    { label: 'Email', icon: Mail, href: `mailto:?subject=${enc('Join me on Vendibook')}&body=${enc(`${text} ${link}`)}` },
    { label: 'SMS', icon: MessageCircle, href: `sms:?&body=${enc(`${text} ${link}`)}` },
    { label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${enc(`${text} ${link}`)}` },
    { label: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}` },
    { label: 'X', icon: Twitter, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}` },
  ];
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors"
          aria-label={`Share via ${t.label}`}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
        </a>
      ))}
    </div>
  );
}

function EmailInviteComposer() {
  const [emails, setEmails] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const parsed = Array.from(
    new Set(
      emails
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  );
  const overLimit = parsed.length > 10;

  const send = async () => {
    if (parsed.length === 0) {
      toast.error('Enter at least one valid email address');
      return;
    }
    if (overLimit) {
      toast.error('Maximum 10 emails per invite');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-referral-invite', {
        body: { emails: parsed, note: note.trim() || undefined },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) {
        toast.success(`Invite sent to ${sent} ${sent === 1 ? 'person' : 'people'}`);
        setEmails('');
        setNote('');
      } else {
        toast.error('No invites were sent');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-3 space-y-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-foreground">Invite by email</div>
        <div className="text-[10px] text-muted-foreground">
          {parsed.length}/10 valid
        </div>
      </div>
      <Input
        placeholder="friend@example.com, another@example.com"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        className="text-xs"
      />
      <Textarea
        placeholder="Add a short personal note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        rows={2}
        className="text-xs resize-none"
      />
      <Button
        onClick={send}
        disabled={sending || parsed.length === 0 || overLimit}
        size="sm"
        className="w-full"
      >
        {sending ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
        ) : (
          <><Send className="h-3.5 w-3.5 mr-1.5" /> Send {parsed.length || ''} invite{parsed.length === 1 ? '' : 's'}</>
        )}
      </Button>
    </div>
  );
}
