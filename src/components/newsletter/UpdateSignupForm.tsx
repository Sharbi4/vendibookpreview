import { useId, useRef, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_CONTENT, UPDATE_SMS_DISCLOSURE, validateUpdateSignup, type UpdateRole } from '../../../supabase/functions/_shared/updatePreferences';
import './updates.css';

const roles = [
  { id: 'renter', name: 'Renter', detail: 'Find your next rental' },
  { id: 'buyer', name: 'Buyer', detail: 'Find a truck or trailer' },
  { id: 'host', name: 'Host', detail: 'Grow your rentals' },
  { id: 'seller', name: 'Seller', detail: 'Make your next sale' },
] as const;
const topics = [{ id: 'listings', title: 'Listings near you', detail: 'Food trucks, trailers, and spaces' }, { id: 'regulations', title: 'Rules & regulations', detail: 'Permits, requirements, and changes to know' }, { id: 'news', title: 'The mobile food industry', detail: 'Business stories, ideas, and market updates' }];

export function UpdateSignupForm({ source = 'homepage', defaultRole, preview = false, onDone }: { source?: string; defaultRole?: UpdateRole; preview?: boolean; onDone?: () => void }) {
  const [step, setStep] = useState<'role'|'interests'|'contact'|'texts'|'success'>('role');
  const [role, setRole] = useState<UpdateRole | ''>(defaultRole || '');
  const [zip, setZip] = useState('');
  const [selected, setSelected] = useState(['listings', 'regulations', 'news']);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const id = useId();
  useEffect(() => { if (firstRender.current) { firstRender.current = false; return; } heading.current?.focus(); }, [step]);
  const move = (next: typeof step) => { setError(''); setStep(next); };
  async function submit(e: React.FormEvent, emailOnly = false) {
    e.preventDefault(); setError('');
    try {
      const body = validateUpdateSignup({ email, name, role, zip, topics: selected, phone: emailOnly ? '' : phone, smsConsent: emailOnly ? false : smsConsent, emailConsent });
      setBusy(true);
      if (!preview) {
        const { data, error: invokeError } = await supabase.functions.invoke('marketplace-updates', { body: { action: 'subscribe', ...body, emailConsent, source, website: '' } });
        if (invokeError || !data?.ok) throw new Error(data?.error || 'We couldn’t send your confirmation. Please try again.');
        try { localStorage.setItem('newsletter_subscribed', 'pending'); } catch { /* Storage is optional. */ }
      }
      if (emailOnly) { setPhone(''); setSmsConsent(false); }
      move('success'); onDone?.();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="vb-updates">
    <div className="vu-brand"><img src="/brand/vendibook-logo-email.png" alt="Vendibook" width="152" height="46"/><span>YOUR MARKETPLACE UPDATE</span></div>
    <div className="vu-progress" aria-label={step === 'success' ? 'Request complete' : `${step === 'role' ? 'Your role' : step === 'interests' ? 'Your interests' : 'Your delivery preferences'}`}>
      {['role', 'interests', 'contact', 'texts'].map((s, i) => <span key={s} className={i <= ['role', 'interests', 'contact', 'texts', 'success'].indexOf(step) ? 'vu-progress-active' : ''}/>)}
    </div>
    <div key={step} className="vu-stage">
      {step === 'role' && <>
        <p className="vu-eyebrow">Listings. Insights. Your next move.</p><h2 ref={heading} tabIndex={-1}>Stay ahead.<br/><em>Stay in the know.</em></h2>
        <p className="vu-intro">New listings near you and mobile food news.<br/>What brings you to Vendibook?</p>
        <fieldset className="vu-roles"><legend className="sr-only">Choose your role</legend>{roles.map(({ id: roleId, name: label, detail }) => <label key={roleId} className={`vu-role ${role === roleId ? 'is-selected' : ''}`}>
          <input type="radio" name={`${id}-role`} value={roleId} checked={role === roleId} onChange={() => setRole(roleId)}/><span><strong>{label}</strong><small>{detail}</small></span><span className="vu-selection" aria-hidden="true">{role === roleId && <Check size={12}/>}</span>
        </label>)}</fieldset>
        <button className="vu-primary" disabled={!role} onClick={() => move('interests')}>Make it personal <ArrowRight size={17}/></button><p className="vu-fineprint">A thoughtful update, not another crowded inbox.</p>
      </>}
      {step === 'interests' && <>
        <button className="vu-back" onClick={() => move('role')}><ArrowLeft size={14}/> Your role</button><p className="vu-eyebrow">Your interests</p><h2 ref={heading} tabIndex={-1}>Keep it <em>relevant.</em></h2><p className="vu-intro">{role && ROLE_CONTENT[role].detail}</p>
        <label className="vu-label" htmlFor={`${id}-zip`}>Where are you looking?</label><input className="vu-input" id={`${id}-zip`} inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="Your US ZIP code" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0,5))}/>
        <fieldset className="vu-topics"><legend className="vu-label">What would you like to hear about?</legend>{topics.map(t => <label key={t.id} className="vu-topic"><input type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, t.id] : prev.filter(v=>v!==t.id))}/><span><strong>{t.title}</strong><small>{t.detail}</small></span></label>)}</fieldset>
        <button className="vu-primary" disabled={!/^\d{5}$/.test(zip) || !selected.length} onClick={() => move('contact')}>Continue <ArrowRight size={17}/></button>
      </>}
      {step === 'contact' && <>
        <button className="vu-back" onClick={() => move('interests')} disabled={busy}><ArrowLeft size={14}/> Your interests</button><p className="vu-eyebrow">Your email updates</p><h2 ref={heading} tabIndex={-1}>Where should<br/><em>we send them?</em></h2>
        <form onSubmit={e => { e.preventDefault(); move('texts'); }} className="vu-form">
          <div className="vu-field"><label className="vu-label" htmlFor={`${id}-name`}>First name <span>optional</span></label><input className="vu-input" id={`${id}-name`} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" maxLength={80} disabled={busy}/></div>
          <div className="vu-field"><label className="vu-label" htmlFor={`${id}-email`}>Email address</label><input className="vu-input" id={`${id}-email`} type="email" required autoComplete="email" placeholder="you@example.com" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} disabled={busy}/></div>
          <label className="vu-consent"><input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} required disabled={busy}/><span>Email me the Vendibook updates I selected. I can unsubscribe at any time.</span></label>
          <button className="vu-primary" disabled={!emailConsent}>Continue <ArrowRight size={17}/></button><p className="vu-fineprint">Next: optional texts. You can keep email only.</p>
        </form>
      </>}
      {step === 'texts' && <>
        <button className="vu-back" onClick={() => move('contact')} disabled={busy}><ArrowLeft size={14}/> Your email</button><p className="vu-eyebrow">Optional · Text updates</p><h2 ref={heading} tabIndex={-1}>Want texts, <em>too?</em></h2>
        <p className="vu-intro">Marketing texts are coming soon. Save your preference now; verify your number after confirming your email.</p>
        <form onSubmit={submit} className="vu-form">
          <label className="vu-label" htmlFor={`${id}-phone`}>Mobile number <span>optional</span></label><input className="vu-input" id={`${id}-phone`} type="tel" autoComplete="tel" placeholder="(520) 555-0123" value={phone} maxLength={24} onChange={e => { setPhone(e.target.value); setSmsConsent(false); }} disabled={busy}/>
          <label className="vu-consent vu-sms-agreement"><input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} required disabled={busy}/><span>{UPDATE_SMS_DISCLOSURE} <a href="/legal/marketplace-updates" target="_blank" rel="noreferrer">SMS terms</a> · <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a></span></label>
          {error && <p className="vu-error" role="alert">{error}</p>}<button className="vu-primary" disabled={busy || !phone.trim() || !smsConsent}>{busy ? 'Sending confirmation…' : 'Add texts & confirm email'} {!busy && <ArrowRight size={17}/>}</button>
          <button type="button" className="vu-email-only" disabled={busy} onClick={e => void submit(e, true)}>Email only — send confirmation</button>
        </form>
      </>}
      {step === 'success' && <div className="vu-success"><span className="vu-success-icon"><Check size={28}/></span><p className="vu-eyebrow">{preview ? 'Preview complete' : 'One last step'}</p><h2 ref={heading} tabIndex={-1}>{preview ? 'Looks good.' : 'Check your inbox.'}</h2><p className="vu-intro">{preview ? 'This is a design preview. No email was sent and no information was saved.' : 'If this address can receive Vendibook updates, a confirmation link is on its way. Open it to save your preferences.'}</p>{phone && <p className="vu-fineprint">You’ll verify your mobile number separately. Entering it here does not activate texts.</p>}<a className="vu-primary" href={role ? ROLE_CONTENT[role].href : '/search'}>{role ? ROLE_CONTENT[role].cta : 'Explore Vendibook'}<ArrowRight size={17}/></a></div>}
    </div>
  </div>;
}
