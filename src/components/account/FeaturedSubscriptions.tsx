import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function FeaturedSubscriptions() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const query = useQuery({queryKey:['featured-subscriptions', user?.id], enabled:!!user, queryFn:async()=>{
    const result = await supabase.from('square_billing_attempts').select('*').eq('user_id',user!.id).eq('tier','featured_listing_monthly').not('subscription_id','is',null).order('created_at',{ascending:false});
    if(result.error) throw result.error;
    return result.data as (typeof result.data[number] & {cancel_confirmed_at?:string|null})[];
  }});
  if(query.isLoading || (!query.error && !query.data?.length)) return null;
  return <section className="my-5 rounded-2xl border bg-card p-5"><h3 className="font-semibold">Featured listing subscriptions</h3><p className="mt-1 text-xs text-muted-foreground">$49/month per listing. Cancel anytime. Automatically cancels when the sale is recorded. Rental listings renew until canceled.</p>
    {(error || query.error) && <p role="alert" className="mt-3 text-sm text-destructive">{error || 'Could not load Featured subscriptions.'}<button onClick={()=>void query.refetch()} className="ml-2 underline">Retry</button></p>}
    {query.data?.map(row=><div key={row.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><Link className="text-sm font-medium underline" to={`/listing/${row.listing_id}`}>View featured listing</Link><p className="mt-1 text-xs text-muted-foreground">{row.cancel_confirmed_at ? 'Renewal canceled' : row.status === 'active' ? 'Active' : row.status.replace(/_/g,' ')}{row.paid_through ? ` · Paid through ${new Date(row.paid_through).toLocaleDateString()}` : ''}</p></div>{!row.cancel_confirmed_at && row.status !== 'canceled' && <Button variant="outline" disabled={!!busy} onClick={async()=>{
      setBusy(row.id);setError('');
      try { const result=await supabase.functions.invoke('square-billing',{body:{action:'cancel',attempt_id:row.id}});if(result.error)throw result.error;await query.refetch(); }
      catch {setError('Cancellation could not be confirmed. Please try again.');}finally{setBusy(null);}
    }}>{busy===row.id ? 'Canceling…' : 'Cancel renewal'}</Button>}</div>)}
  </section>;
}
