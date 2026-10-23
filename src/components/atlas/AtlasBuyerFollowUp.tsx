import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import type { AtlasListingCard } from '@/lib/atlas/atlasTools';

export interface AtlasFollowUpDraft { summary: string; topic: string }

/** Buyer submits their own contact details and specific permission. No mailing-list enrollment. */
export default function AtlasBuyerFollowUp({ draft, cards, onClose, onSaved }: {
  draft: AtlasFollowUpDraft | null; cards: AtlasListingCard[]; onClose: () => void; onSaved: (reference: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ reference: string; due: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft || !consent || busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: problem } = await invokeEdge<{ reference_code: string; follow_up_by: string }>('atlas-follow-up', { body: {
        intent: 'buyer_follow_up', name: name.trim(), email: email.trim(), preferred_contact: 'email',
        follow_up_consent: true, consent_version: 'atlas-buyer-follow-up-v1',
        topic: draft.topic, summary: draft.summary,
        shortlist: cards.slice(0, 6).map(c => ({ id: c.id, title: c.title })),
        listing_id: cards[0]?.id, page_url: window.location.pathname,
      } }, { retries: 0 });
      if (problem || !data?.reference_code) { setError(problem || 'Could not save your request. Please try again.'); return; }
      setDone({ reference: data.reference_code, due: data.follow_up_by }); onSaved(data.reference_code);
    } catch { setError('Could not save your request. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-w-md rounded-3xl">
      <DialogHeader>
        <DialogTitle>{done ? 'Your follow-up is saved' : 'Pick this up with our team'}</DialogTitle>
        <DialogDescription>{done ? `A Vendibook teammate will email you by ${done.due}. Reference ${done.reference}.` : 'Keep your shortlist and questions together. A Vendibook teammate can help with the equipment, your offer, or the next step.'}</DialogDescription>
      </DialogHeader>
      {done ? <button className="atlas-pill" onClick={onClose}>Keep browsing</button> : <form onSubmit={submit} className="space-y-4">
        {cards.length > 0 && <p className="text-sm text-muted-foreground">Includes {cards.length} listing{cards.length === 1 ? '' : 's'} from this conversation.</p>}
        <label className="block text-sm font-medium">Your name<input required maxLength={80} autoComplete="name" className="mt-1 w-full rounded-xl border bg-background p-3 text-base" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="block text-sm font-medium">Email address<input required type="email" maxLength={120} autoComplete="email" className="mt-1 w-full rounded-xl border bg-background p-3 text-base" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />I agree that Vendibook may email me about this shortlist and buying questions. I can ask the team to stop at any time.</label>
        <p className="text-xs text-muted-foreground">This requests a personal follow-up, not a newsletter subscription. <Link to="/privacy" className="underline">Privacy Policy</Link></p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={!consent || busy} className="atlas-pill w-full disabled:opacity-50">{busy ? 'Saving…' : 'Request my email follow-up'}</button>
        <button type="button" className="w-full py-2 text-sm text-muted-foreground" disabled={busy} onClick={onClose}>No thanks, keep browsing</button>
      </form>}
    </DialogContent>
  </Dialog>;
}
