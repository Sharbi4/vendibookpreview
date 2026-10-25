import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Inbox = {admin:boolean;threads:Array<{id:string;title:string;name:string;email?:string;last_activity_at:string;released:boolean}>};
export default function ManagedInquiryInbox({admin=false}:{admin?:boolean}) {
 const {user}=useAuth();
 const q=useQuery({queryKey:['managed-inquiries',user?.id],enabled:!!user,refetchInterval:30000,queryFn:async()=>{
  const r=await supabase.functions.invoke('managed-inquiries',{body:{action:'inbox'}});
  if(r.error||r.data?.error)throw new Error('Could not load guest inquiries');
  return r.data as Inbox;
 }});
 return <section className="my-5 rounded-2xl border bg-white p-5 text-stone-800">
  <h2 className="font-semibold">{admin?'Managed messaging hub':'Listing inquiries'}</h2>
  <p className="mt-1 text-xs text-stone-500">Relayed by Vendibook. Replies are reviewed before reaching the other participant. Contact details stay private.</p>
  {q.isLoading?<p className="mt-4 text-sm">Loading…</p>:q.error?<p role="alert" className="mt-4 text-sm">Could not load inquiries. <button className="underline" onClick={()=>void q.refetch()}>Retry</button></p>:!q.data?.threads.length?<p className="mt-4 text-sm">No relayed inquiries yet.</p>:<ul className="mt-4 divide-y">{q.data.threads.map(t=><li key={t.id}>
   <Link className="block rounded-lg py-3 focus-visible:outline-orange-500" to={`/inquiries/${t.id}`}>
    <strong className="text-sm">{t.name}</strong>
    <p className="mt-1 text-sm">{t.title}</p>
    <p className="mt-1 text-xs text-stone-500">{admin&&!t.released?'Awaiting review':'Relayed by Vendibook'} · {new Date(t.last_activity_at).toLocaleString()}</p>
    {admin&&q.data?.admin&&<p className="mt-1 text-xs text-stone-500">{t.email}</p>}
   </Link>
  </li>)}</ul>}
 </section>;
}
