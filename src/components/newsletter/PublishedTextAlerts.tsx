import { useEffect, useState } from 'react';
import { BellRing, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import InlinePhoneVerification from '@/components/comms/InlinePhoneVerification';
import { SmsConsentField } from '@/components/sms/SmsConsentField';
import { SMS_CONSENT_DISCLOSURE } from '@/lib/sms/consent';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import './updates.css';

export default function PublishedTextAlerts() {
  const { user } = useAuth();
  const [open,setOpen]=useState(false),[phone,setPhone]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[checking,setChecking]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
  async function checkPhone() {
    if(!user) return;
    setChecking(true); setError('');
    try {
      const { data, error: readError }=await (supabase as any).from('signup_phone_verifications').select('phone_e164').eq('user_id',user.id).maybeSingle();
      if(readError) throw new Error('We couldn’t check your number. Please reopen this window to retry.');
      setPhone(data?.phone_e164 || '');
    } catch(e){setError((e as Error).message);} finally {setChecking(false);}
  }
  useEffect(()=>{if(open) void checkPhone();},[open,user?.id]);
  async function enable() {
    if(!consent || !phone || busy) return;
    setBusy(true);setError('');
    try {
      const { data,error:invokeError }=await supabase.functions.invoke('sms-record-consent',{body:{phone,source:'listing',consent:true,marketing:false,disclosureText:SMS_CONSENT_DISCLOSURE,userAgent:navigator.userAgent}});
      if(invokeError || !data?.ok || data.status!=='opted_in') throw new Error('We couldn’t enable alerts. Verify your number and try again.');
      setDone(true);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <><section className="vu-published-invite" aria-label="Listing text alerts"><div><BellRing size={24} className="mb-4 text-[#94704e]" aria-hidden="true"/><h2>Stay close to your next opportunity.</h2><p>Get listing activity and inquiry alerts by text. Verify your number and choose whether to turn them on.</p></div><Button variant="outline" className="rounded-full border-[#cbb9a3] bg-white/70" onClick={()=>setOpen(true)}>Set up text alerts <ArrowRight size={16}/></Button></section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sale-light sm:max-w-md"><DialogTitle>{done ? 'Text alerts are on.' : 'Your listing. A little closer.'}</DialogTitle><DialogDescription>Optional listing and account alerts through Vendibook’s existing text service.</DialogDescription>
      {!user ? <Button asChild><a href="/auth">Sign in to set up alerts</a></Button> : checking ? <p role="status">Checking your verified number…</p> : done ? <><Check className="text-green-700"/><p className="text-sm">You can manage alerts in your notification settings or reply STOP to opt out.</p></> : phone ? <><p className="text-sm">Verified number: {phone}</p><SmsConsentField phone={phone} onPhoneChange={()=>{}} showPhoneInput={false} consent={consent} onConsentChange={setConsent}/><Button disabled={!consent || busy} onClick={enable}>{busy ? 'Saving…' : 'Enable text alerts'}</Button></> : !error ? <InlinePhoneVerification onVerified={()=>void checkPhone()}/> : null}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </DialogContent></Dialog></>;
}
