import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { saveGuestCheckoutDraft, type GuestCheckoutDraftInput } from '@/lib/guestCheckoutDraft';

interface Props {
  /** Everything except the email, read at submit time so dates/totals stay current. */
  getDraft: () => Omit<GuestCheckoutDraftInput, 'email'>;
}

/**
 * First-step checkout card for visitors who aren't signed in: leave just an
 * email and we send a link back to finish if they get interrupted.
 */
const GuestCheckoutEmailCapture = ({ getDraft }: Props) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'saving') return;
    setError(null);
    setStatus('saving');
    const result = await saveGuestCheckoutDraft({ ...getDraft(), email });
    if (result.ok) {
      setStatus('saved');
    } else {
      setStatus('idle');
      setError(result.message);
    }
  };

  if (status === 'saved') {
    return (
      <div className="v2-checkout-section" role="status" aria-live="polite">
        <div className="v2-checkout-section-body flex items-start gap-3">
          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">Saved — we’ll email {email.trim()} a link back here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in whenever you’re ready to finish. If you’re interrupted, the link brings you straight back to this checkout.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="v2-checkout-section" onSubmit={submit} noValidate>
      <div className="v2-checkout-section-body space-y-3">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">Not ready to sign in? Save this checkout</p>
            <p className="text-xs text-muted-foreground mt-1">
              Just your email. We’ll send a link back here if you don’t finish — up to two reminders, unsubscribe anytime.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="guest-checkout-email" className="sr-only">Email address</label>
          <input
            id="guest-checkout-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={!!error}
            aria-describedby={error ? 'guest-checkout-email-error' : undefined}
          />
          <button type="submit" className="v2-btn shrink-0 inline-flex items-center justify-center gap-2" disabled={status === 'saving' || !email.trim()}>
            {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Email me a link
          </button>
        </div>
        {error ? (
          <p id="guest-checkout-email-error" className="text-xs text-destructive" role="alert">{error}</p>
        ) : null}
      </div>
    </form>
  );
};

export default GuestCheckoutEmailCapture;
