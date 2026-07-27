import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SmsConsentField } from './SmsConsentField';
import { normalizeNanpToE164 } from '@/lib/sms/phone';
import {
  SMS_CONSENT_DISCLOSURE,
  SMS_PROMPT_DISMISS_KEY,
  SMS_PROMPT_DISMISS_TTL_MS,
} from '@/lib/sms/consent';

type Placement = 'booking' | 'listing' | 'settings';

interface Copy {
  heading: string;
  description: string;
}

const COPY: Record<Placement, Copy> = {
  booking: {
    heading: 'Get important booking updates by text',
    description:
      'Receive booking confirmations, payment and document reminders, and pickup or delivery updates.',
  },
  listing: {
    heading: 'Receive listing and inquiry updates by text',
    description:
      'Get notified when your listing status changes or a customer sends an inquiry.',
  },
  settings: {
    heading: 'Turn on text updates',
    description:
      'Receive account, booking, payment, and support texts. Optional — you can opt out any time.',
  },
};

function dismissKey(placement: Placement) {
  return `${SMS_PROMPT_DISMISS_KEY}.${placement}`;
}

function wasRecentlyDismissed(placement: Placement): boolean {
  try {
    const raw = localStorage.getItem(dismissKey(placement));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < SMS_PROMPT_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export interface SmsContextualInviteProps {
  placement: Placement;
  /** Set to true if the current user already opted in (parent-controlled). */
  alreadyOptedIn?: boolean;
  /** Default phone value (pre-fills from profile when available). */
  defaultPhone?: string;
  className?: string;
}

/**
 * Non-blocking SMS invite. Never modal; never blocks checkout or publish.
 * Prompt-dismissal state is stored locally, kept separate from the legal
 * consent record on the server.
 */
export const SmsContextualInvite: React.FC<SmsContextualInviteProps> = ({
  placement,
  alreadyOptedIn = false,
  defaultPhone = '',
  className,
}) => {
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(true);
  const [phone, setPhone] = useState(defaultPhone);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alreadyOptedIn) return;
    setDismissed(wasRecentlyDismissed(placement));
  }, [alreadyOptedIn, placement]);

  if (alreadyOptedIn || dismissed || done) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(placement), String(Date.now()));
    } catch { /* ignore */ }
    setDismissed(true);
  };

  const submit = async () => {
    setError(null);
    if (!consent) {
      setError('Please check the box to confirm you want text updates.');
      return;
    }
    if (!normalizeNanpToE164(phone)) {
      setError('Enter a valid US or Canadian mobile number.');
      return;
    }
    setBusy(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke('sms-record-consent', {
        body: {
          phone,
          source: placement,
          consent: true,
          marketing: false,
          disclosureText: SMS_CONSENT_DISCLOSURE,
          userAgent: navigator.userAgent,
        },
      });
      if (fnErr) throw fnErr;
      setDone(true);
      toast({
        title: 'Text updates on',
        description: 'You can manage this any time in Notification settings.',
      });
    } catch (e) {
      setError((e as Error).message || 'Could not save your preference.');
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[placement];
  return (
    <div
      className={`relative rounded-2xl border border-border/70 bg-card/40 p-4 ${className ?? ''}`}
      data-testid={`sms-invite-${placement}`}
      role="region"
      aria-label={copy.heading}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-3 pr-6">
        <h3 className="text-sm font-semibold text-foreground">{copy.heading}</h3>
        <p className="text-xs text-muted-foreground mt-1">{copy.description}</p>
      </div>
      <SmsConsentField
        phone={phone}
        onPhoneChange={setPhone}
        consent={consent}
        onConsentChange={setConsent}
        error={error ?? undefined}
        testIdPrefix={`sms-invite-${placement}`}
      />
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={busy} data-testid={`sms-invite-${placement}-submit`}>
          {busy ? 'Saving…' : 'Turn on text updates'}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
};

export default SmsContextualInvite;
