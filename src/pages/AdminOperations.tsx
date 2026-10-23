import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OperationsDashboardView } from '@/components/operations/OperationsDashboardView';
import type { OperationsSnapshot } from '@/lib/operations/types';
import SEO from '@/components/SEO';
export default function AdminOperations(){
 const {user,isLoading}=useAuth();const [days,setDays]=useState(30);
 const permission=useQuery({queryKey:['operations-admin',user?.id],enabled:!!user,queryFn:async()=>{const {data,error}=await supabase.rpc('is_admin',{user_id:user!.id});if(error)throw error;return data===true;}});
 const snapshot=useQuery({queryKey:['operations-snapshot',user?.id,days],enabled:permission.data===true,staleTime:60000,refetchInterval:60000,queryFn:async()=>{const {data,error}=await (supabase.rpc as any)('admin_operations_snapshot',{p_days:days});if(error)throw error;return data as OperationsSnapshot;}});
 const connections=useQuery({queryKey:['operations-connections',user?.id],enabled:permission.data===true,staleTime:300000,queryFn:async()=>{const {data,error}=await supabase.functions.invoke('admin-operations',{body:{action:'connections'}});if(error)throw error;return data;}});
 if(isLoading||permission.isLoading)return <main className="ops-load"><h1>Opening operations…</h1></main>;
 if(!user||!permission.data)return <main className="ops-load"><h1>Admin access required</h1><p>{permission.error?'We could not verify your access. Please try again.':'Sign in with an administrator account to view marketplace activity.'}</p><a href="/auth">Sign in</a></main>;
 if(snapshot.isError)return <main className="ops-load"><h1>Metrics are temporarily unavailable</h1><p>The dashboard could not load its database snapshot. No totals have been estimated.</p><button onClick={()=>void snapshot.refetch()}>Retry</button> <a href="/admin/legacy">Open existing admin tools</a></main>;
 if(!snapshot.data)return <main className="ops-load"><h1>Loading marketplace activity…</h1></main>;
 return <><SEO title="Operations | Vendibook Admin" description="Marketplace operations and communications" noindex/><OperationsDashboardView data={snapshot.data} onRange={setDays} onRefresh={()=>{void snapshot.refetch();void connections.refetch();}} connections={connections.data} connectionsError={connections.isError} onAction={async(action,payload)=>{const {data,error}=await supabase.functions.invoke(action==='resend_receipt'?'admin-order-ops':'admin-operations',{body:{action,...payload}});if(error){let reason='The action failed. Please check the activity log before retrying.';try{const body=await (error as any).context?.json();if(body?.error)reason=body.error;}catch{}throw new Error(reason);}if(action==='resend_receipt'&&!data?.sent)throw new Error(data?.reason||'Receipt was not sent.');return data;}}/></>;
}
