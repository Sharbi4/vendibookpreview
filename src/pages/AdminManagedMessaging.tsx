import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import ManagedInquiryInbox from '@/components/messaging/ManagedInquiryInbox';
import MessageSafetyQueue from '@/components/admin/MessageSafetyQueue';
import AdminSectionNav from '@/components/admin/AdminSectionNav';

export default function AdminManagedMessaging() {
  const { user } = useAuth();
  const access = useQuery({queryKey:['managed-messaging-admin',user?.id],enabled:!!user,queryFn:async()=>{
    const {data,error}=await supabase.rpc('has_role',{_user_id:user!.id,_role:'admin'});
    if(error) throw error;
    return data === true;
  }});
  return <><Header/><main className="container max-w-6xl py-10 pb-28">
    <h1 className="text-3xl font-semibold">Managed messaging</h1>
    {!user ? <p className="mt-4">Sign in with an administrator account.</p> : access.isLoading ? <p role="status">Checking access…</p> : access.error ? <p role="alert">Access could not be verified. <button className="underline" onClick={()=>void access.refetch()}>Retry</button></p> : !access.data ? <p className="mt-4">Administrator access required.</p> : <>
      <AdminSectionNav/>
      <ManagedInquiryInbox admin/>
      <MessageSafetyQueue/>
    </>}
  </main></>;
}
