import { useId, useRef, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, KeyRound, Mail, Store, Tag, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_CONTENT, UPDATE_SMS_DISCLOSURE, validateUpdateSignup, type UpdateRole } from '../../../supabase/functions/_shared/updatePreferences';
import './updates.css';

const roles = [
  { id: 'renter', name: 'Renter', detail: 'Find a space to get started', icon: KeyRound },
  { id: 'buyer', name: 'Buyer', detail: 'Find your next truck or trailer', icon: Truck },
  { id: 'host', name: 'Host', detail: 'Grow your rental business', icon: Store },
  { id: 'seller', name: 'Seller', detail: 'Make your next sale', icon: Tag },
] as const;
const topics = [{ id: 'listings', title: 'Listings near you', detail: 'Food trucks, trailers, and spaces' }, { id: 'regulations', title: 'Rules & regulations', detail: 'Permits, requirements, and changes to know' }, { id: 'news', title: 'The mobile food industry', detail: 'Business stories, ideas, and market updates' }];

export function UpdateSignupForm({ source = 'homepage', defaultRole, preview = false, onDone }: { source?: string; defaultRole?: UpdateRole; preview?: boolean; onDone?: () => void }) {
  const [step, setStep] = useState<'role'|'interests'|'contact'|'success'>('role');
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
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const body = validateUpdateSignup({ email, name, role, zip, topics: selected, phone, smsConsent, emailConsent });
      setBusy(true);
      if (!preview) {
        const { data, error: invokeError } = await supabase.functions.invoke('marketplace-updates', { body: { action: 'subscribe', ...body, emailConsent, source, website: '' } });
        if (invokeError || !data?.ok) throw new Error(data?.error || 'We couldn’t send your confirmation. Please try again.');
        try { localStorage.setItem('newsletter_subscribed', 'pending'); } catch { /* Storage is optional. */ }
      }
      move('success'); onDone?.();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="vb-updates">
    <div className="vu-brand"><span className="vu-monogram" aria-hidden="true"><Mail size={23}/></span><span>THE VENDIBOOK EDIT<small>A little insight. A better next move.</small></span></div>
    <div className="vu-progress" aria-label={step === 'success' ? 'Request complete' : `${step === 'role' ? 'Your role' : step === 'interests' ? 'Your interests' : 'Your delivery preferences'}`}>
      {['role', 'interests', 'contact'].map((s, i) => <span key={s} className={i <= ['role', 'interests', 'contact', 'success'].indexOf(step) ? 'vu-progress-active' : ''}/>)}
    </div>
    <div key={step} className="vu-stage">
      {step === 'role' && <>
        <p className="vu-eyebrow">Made for your next chapter</p><h2 ref={heading} tabIndex={-1}>Good things.<br/><em>Closer to you.</em></h2>
        <p className="vu-intro">Local listings. Industry news. Rules worth knowing.<br/>First, tell us what brings you here.</p>
        <fieldset className="vu-roles"><legend className="sr-only">Choose your role</legend>{roles.map(({ id: roleId, name: label, detail, icon: Icon }) => <label key={roleId} className={`vu-role ${role === roleId ? 'is-selected' : ''}`}>
          <input type="radio" name={`${id}-role`} value={roleId} checked={role === roleId} onChange={() => setRole(roleId)}/><Icon size={21} aria-hidden="true"/><span><strong>{label}</strong><small>{detail}</small></span><span className="vu-selection" aria-hidden="true">{role === roleId && <Check size={12}/>}</span>
        </label>)}</fieldset>
        <button className="vu-primary" disabled={!role} onClick={() => move('interests')}>Make it personal <ArrowRight size={17}/></button><p className="vu-fineprint">A thoughtful update, not another crowded inbox.</p>
      </>}
      {step === 'interests' && <>
        <button className="vu-back" onClick={() => move('role')}><ArrowLeft size={14}/> Your role</button><p className="vu-eyebrow">Your interests</p><h2 ref={heading} tabIndex={-1}>Keep it <em>relevant.</em></h2><p className="vu-intro">{role && ROLE_CONTENT[role].detail}</p>
        <label className="vu-label" htmlFor={`${id}-zip`}>Where are you looking?</label><input className="vu-input" id={`${id}-zip`} inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="Your US ZIP code" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0,5))}/>
        <fieldset className="vu-topics"><legend className="vu-label">What would you like to hear about?</legend>{topics.map(t => <label key={t.id} className="vu-topic"><input type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, t.id] : prev.filter(v=>v!==t.id))}/><span><strong>{t.title}</strong><small>{t.detail}</small></span></label>)}</fieldset>
        <button className="vu-primary" disabled={!/^\d{5}$/.test(zip) || !selected.length} onClick={() => move('contact')}>Choose how to stay in touch <ArrowRight size={17}/></button>
      </>}
      {step === 'contact' && <>
        <button className="vu-back" onClick={() => move('interests')} disabled={busy}><ArrowLeft size={14}/> Your interests</button><p className="vu-eyebrow">Delivered your way</p><h2 ref={heading} tabIndex={-1}>Your inbox.<br/><em>Your kind of updates.</em></h2>
        <form onSubmit={submit} className="vu-form">
          <div className="vu-field"><label className="vu-label" htmlFor={`${id}-name`}>First name <span>optional</span></label><input className="vu-input" id={`${id}-name`} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" maxLength={80} disabled={busy}/></div>
          <div className="vu-field"><label className="vu-label" htmlFor={`${id}-email`}>Email address</label><input className="vu-input" id={`${id}-email`} type="email" required autoComplete="email" placeholder="you@example.com" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} disabled={busy}/></div>
          <label className="vu-consent"><input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} required disabled={busy}/><span>Email me the Vendibook updates I selected. I can unsubscribe at any time.</span></label>
          <div className="vu-sms"><label className="vu-label" htmlFor={`${id}-phone`}>Mobile number <span>optional</span></label><input className="vu-input" id={`${id}-phone`} type="tel" autoComplete="tel" placeholder="(520) 555-0123" value={phone} maxLength={24} onChange={e => { setPhone(e.target.value); setSmsConsent(false); }} disabled={busy}/><p className="vu-fineprint">Want texts too? Verify your number after confirming your email. Marketing text alerts are coming soon.</p>
          {!!phone.trim() && <label className="vu-consent vu-sms-agreement"><input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} required disabled={busy}/><span>{UPDATE_SMS_DISCLOSURE} <a href="/legal/marketplace-updates" target="_blank" rel="noreferrer">SMS terms</a> · <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a></span></label>}</div>
          {error && <p className="vu-error" role="alert">{error}</p>}<button className="vu-primary" disabled={busy || !emailConsent || (!!phone.trim() && !smsConsent)}>{busy ? 'Sending confirmation…' : 'Send my confirmation'} {!busy && <ArrowRight size={17}/>}</button><p className="vu-fineprint">Confirm by email to finish. <a href="/privacy" target="_blank" rel="noreferrer">Privacy policy</a> · No purchase required.</p>
        </form>
      </>}
      {step === 'success' && <div className="vu-success"><span className="vu-success-icon"><Check size={28}/></span><p className="vu-eyebrow">{preview ? 'Preview complete' : 'One last step'}</p><h2 ref={heading} tabIndex={-1}>{preview ? 'Looks good.' : 'Check your inbox.'}</h2><p className="vu-intro">{preview ? 'This is a design preview. No email was sent and no information was saved.' : 'If this address can receive Vendibook updates, a confirmation link is on its way. Open it to save your preferences.'}</p>{phone && <p className="vu-fineprint">You’ll verify your mobile number separately. Entering it here does not activate texts.</p>}<a className="vu-primary" href={role ? ROLE_CONTENT[role].href : '/search'}>{role ? ROLE_CONTENT[role].cta : 'Explore Vendibook'}<ArrowRight size={17}/></a></div>}
    </div>
  </div>;
}
