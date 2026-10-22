import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_CONTENT, type UpdateRole } from '../../supabase/functions/_shared/updatePreferences';
import SEO from '@/components/SEO';
import '@/components/newsletter/updates.css';

export default function UpdateConfirmation() {
  const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [result,setResult]=useState<{role:UpdateRole;zip:string;sms_status:string;phone?:string}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[code,setCode]=useState(''),[sent,setSent]=useState(false),[verified,setVerified]=useState(false),[cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown>0){const timer=setTimeout(()=>setCooldown(v=>v-1),1000);return()=>clearTimeout(timer);}},[cooldown]);
  async function action(type:'confirm'|'send_code'|'verify_code') {
    setBusy(true);setError('');
    try{
      const {data,error:invokeError}=await supabase.functions.invoke('marketplace-updates',{body:{action:type,token,code,verificationConsent:type==='send_code'}});
      let payload=data;
      if(invokeError?.context){try{payload=await invokeError.context.json();}catch{/* generic error */}}
      if(invokeError || !payload?.ok) throw new Error(payload?.error || 'We couldn’t complete that request. Please try again.');
      if(type==='confirm'){setResult(payload);try{localStorage.setItem('newsletter_subscribed','confirmed');}catch{/* optional */}}
      if(type==='send_code'){setSent(true);setCooldown(60);}
      if(type==='verify_code')setVerified(true);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const content=result ? ROLE_CONTENT[result.role] : null;
  return <main className="min-h-screen bg-[#f5f6f8] px-3 py-6 sm:px-4 sm:py-16"><SEO title="Confirm your updates | Vendibook" description="Confirm your Vendibook email preferences." noindex/><div className="mx-auto max-w-md vb-updates shadow-xl"><div className="vu-brand"><img src="/brand/vendibook-logo-email.png" alt="Vendibook" width="152" height="46"/><span>YOUR MARKETPLACE UPDATE</span></div>
    {!result ? <><p className="vu-eyebrow">Your updates, your choice</p><h1 className="text-3xl font-semibold tracking-tight">One last step.</h1><p className="vu-intro">Confirm your email to save your selected topics, location, and role. Text alerts require a separate number verification.</p><button className="vu-primary" disabled={busy || !token} onClick={()=>action('confirm')}>{busy ? 'Confirming…' : 'Confirm my email updates'}</button>{!token && <p className="vu-error">Open the confirmation link in your email, or <Link to="/subscribe">request a new one</Link>.</p>}</> : <><Check className="mb-5 text-green-700"/><p className="vu-eyebrow">Preferences confirmed</p><h1 className="text-3xl font-semibold tracking-tight">{content?.title}</h1><p className="vu-intro">Your {result.role} preferences and ZIP {result.zip} are saved. {content?.detail}</p>
      {result.sms_status==='pending_verification' && !verified && <div className="vu-sms"><h2 style={{fontSize:21}}>Confirm your mobile.</h2><p className="vu-intro">We’ll send a one-time code to {result.phone}. Marketing text alerts are coming soon; verifying your number saves your requested opt-in for launch.</p>{sent && <><label className="vu-label" htmlFor="updates-code">Verification code</label><input id="updates-code" className="vu-input" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6}/><button className="vu-primary mt-3" disabled={busy || code.length!==6} onClick={()=>action('verify_code')}>Verify my number</button></>}<button className="vu-primary mt-3" disabled={busy || cooldown>0} onClick={()=>action('send_code')}>{cooldown ? `Resend in ${cooldown}s` : sent ? 'Resend code' : 'Text me a verification code'}</button><p className="vu-fineprint">Message and data rates may apply. Reply STOP to opt out or HELP for help.</p></div>}
      {(verified || result.sms_status==='verified') && <p className="vu-intro">Your number is verified. Your text preferences are saved for the marketing alerts launch.</p>}
      {result.sms_status==='opted_out' && <p className="vu-intro">Your text messages remain opted out.</p>}
      <Link className="vu-primary mt-5" to={content?.href || '/search'}>{content?.cta}</Link>
    </>}{error && <p className="vu-error" role="alert">{error}</p>}<p className="vu-fineprint"><Link to="/subscribe">Update your preferences</Link> · <Link to="/privacy">Privacy</Link></p></div></main>;
}
