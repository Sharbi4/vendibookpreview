import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SEO from '@/components/SEO';
import { maskContactDetails } from '../../supabase/functions/_shared/contactPatterns';

type Message={id:string;sender_role:string;body:string;held:boolean;hold_reason?:string;created_at:string;sent_at?:string;send_started_at?:string;released_body?:string};
type Thread={messages:Message[];role:string;name:string;seller_name:string;listing_id:string;closed:boolean;email?:string};
export default function ManagedInquiry(){
 const {id}=useParams();
 return id ? <ManagedInquiryThread key={id} id={id}/> : null;
}
function ManagedInquiryThread({id}:{id:string}){
 const {user,isLoading}=useAuth();
 const [access]=useState(()=>{
  const raw=new URLSearchParams(window.location.hash.slice(1)).get('access');
  const key=`inquiry-access:${id}`;
  if(raw&&/^[a-f0-9]{64}$/.test(raw)){
   try{sessionStorage.setItem(key,raw);}catch{/* Private browsing still works for this view. */}
   window.history.replaceState(null,'',window.location.pathname);return raw;
  }
  try{return sessionStorage.getItem(key)||'';}catch{return '';}
 });
 const [thread,setThread]=useState<Thread|null>(null);
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [body,setBody]=useState('');const [accessEmail,setAccessEmail]=useState('');
 const [accessSent,setAccessSent]=useState(false);const [status,setStatus]=useState('');
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [recipient,setRecipient]=useState('seller');const requestKey=useRef(crypto.randomUUID());
 const call=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
  const r=await supabase.functions.invoke('managed-inquiries',{body:{action,id,token:access,...extra}});
  if(r.error||r.data?.error)throw new Error(r.data?.error||'Could not complete this request. Refresh the conversation before retrying.');
  return r.data;
 },[id,access]);
 const load=useCallback(async()=>{try{setThread(await call('read'));setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load');}},[call]);
 useEffect(()=>{if(!isLoading)void load();},[isLoading,user?.id,load]);
 return <main className="sale-light min-h-screen bg-stone-50 px-4 py-6 pb-28 text-stone-900">
  <SEO title="Your private conversation | Vendibook" description="Secure listing conversation" noindex/>
  <div className="mx-auto max-w-2xl">
   <header className="mb-6 flex items-center justify-between border-b pb-5"><Link to="/"><img src="/brand/vendibook-logo-email-white.png" alt="Vendibook" className="w-36"/></Link><Link to="/dashboard/messages" className="text-sm underline">Inbox</Link></header>
   <h1 className="text-2xl font-semibold">{thread ? `${thread.name} · ${thread.seller_name}` : 'Your listing conversation'}</h1>
   <p className="my-3 text-sm leading-6 text-stone-600">Relayed by Vendibook. Every message is reviewed before it reaches the other participant. Email addresses and phone numbers stay private. Keep payments online through Vendibook.</p>
   {error&&<div role="alert" className="my-4 rounded-xl border bg-white p-4 text-sm">{error}<button onClick={()=>void load()} className="ml-2 underline">Refresh</button></div>}
   {status&&<p role="status" className="my-3 text-sm">{status}</p>}
   {!thread&&!isLoading&&<div className="my-5 space-y-4">
    <Link to={`/auth?redirect=${encodeURIComponent(`/inquiries/${id}`)}`} className="underline">Have an account? Sign in</Link>
    <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await call('request_access',{email:accessEmail});setAccessSent(true);}catch{setError('Could not request an access email. Please try later.');}finally{setBusy(false);}}}>
     <label className="block text-sm">Guest email<input type="email" required value={accessEmail} onChange={e=>setAccessEmail(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 text-base"/></label>
     <Button disabled={busy}>Email a secure reply link</Button>
     {accessSent&&<p role="status" className="text-sm">If this email matches the inquiry, a secure link will arrive. Allow 15 minutes between requests.</p>}
    </form>
   </div>}
   {thread&&<>
    <Link to={`/listing/${thread.listing_id}`} className="text-sm underline">View listing</Link>
    {thread.email&&<p className="mt-2 text-xs">Private admin contact: {thread.email}</p>}
    {thread.messages.length>=100&&<button className="mt-4 text-sm underline" disabled={busy} onClick={async()=>{setBusy(true);try{const older=await call('read',{before:thread.messages[0].created_at});setThread({...thread,messages:[...older.messages,...thread.messages]});}catch{setError('Earlier messages could not be loaded.');}finally{setBusy(false);}}}>Load earlier messages</button>}
    <ol className="my-6 space-y-4">{thread.messages.map(m=><li key={m.id} className="rounded-2xl border bg-white p-5 shadow-sm">
     <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-stone-500"><strong>{m.sender_role==='support'?'Vendibook support':m.sender_role==='seller'?thread.seller_name:thread.name}</strong><time>{new Date(m.sent_at||m.created_at).toLocaleString()}</time></div>
     <p className="whitespace-pre-wrap break-words text-sm leading-6">{m.body}</p>
     <p className="mt-3 text-xs text-stone-500">{m.sent_at?'Reviewed and relayed by Vendibook':'Awaiting Vendibook review — not sent to the other participant'}</p>
     {thread.role==='support'&&m.held&&<div className="mt-4 border-t pt-4">
      {m.send_started_at?<p className="text-sm text-amber-800">Dispatch was started. Reconcile the Resend record before retrying; this message remains private until delivery is recorded.</p>:<>
       <label className="text-xs font-medium" htmlFor={`review-${m.id}`}>Reviewed message to send</label>
       <Textarea id={`review-${m.id}`} value={drafts[m.id]??maskContactDetails(m.body)} onChange={e=>setDrafts(d=>({...d,[m.id]:e.target.value}))} rows={4} maxLength={5000} className="mt-2 text-base"/>
       <Button variant="cta" className="mt-3" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await call('review',{message_id:m.id,decision:'release',message:drafts[m.id]??maskContactDetails(m.body)});setStatus('Reviewed email sent. The message is now visible to its recipient.');await load();}catch(e){setError(e instanceof Error?e.message:'Dispatch could not be confirmed. Check Resend before retrying.');}finally{setBusy(false);}}}>Approve and send relay</Button>
      </>}
     </div>}
    </li>)}</ol>
    {!thread.closed&&<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{await call('reply',{message:body,request_key:requestKey.current,recipient_role:recipient});setBody('');requestKey.current=crypto.randomUUID();setStatus('Your reply is with Vendibook for review. It has not been sent to the other participant.');await load();}catch(e){setError(e instanceof Error?e.message:'Message could not be saved.');}finally{setBusy(false);}}}>
     {thread.role==='support'&&<label className="mb-3 block text-sm">Support reply recipient<select value={recipient} onChange={e=>setRecipient(e.target.value)} className="ml-3 rounded border p-2"><option value="seller">Seller</option><option value="guest">Buyer</option></select></label>}
     <label htmlFor="managed-reply" className="text-sm font-medium">{thread.role==='support'?'Draft as Vendibook support':'Your reply'}</label>
     <Textarea id="managed-reply" value={body} onChange={e=>setBody(e.target.value)} required maxLength={5000} rows={4} className="my-2 text-base"/>
     <Button type="submit" variant="cta" disabled={busy||!body.trim()} className="min-h-11 w-full">{busy?'Saving…':'Submit reply for review'}</Button>
    </form>}
    <button className="mt-4 text-sm underline" onClick={()=>void load()}>Refresh conversation</button>
   </>}
  </div>
 </main>;
}
