import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { hasCurrentLegalAcceptance } from '../_shared/legalVersions.ts';
import { getVideoProvider, VideoProviderUnavailableError } from '../_shared/videoProvider.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const cors = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json' };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  try {
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const token=req.headers.get('Authorization')?.replace('Bearer ','');
    if(!token) return json({error:'authentication_required'},401);
    const {data:{user}}=await admin.auth.getUser(token); if(!user)return json({error:'authentication_required'},401);
    const {walkthrough_id}=await req.json(); if(!walkthrough_id)return json({error:'walkthrough_id_required'},400);
    if(!await checkRateLimit('video_walkthrough_access',user.id,12,10))return json({error:'rate_limited'},429);
    // Legal gate at the execution layer: a room token is only minted for a
    // participant who has accepted the CURRENT walkthrough terms, device
    // permissions notice, and recording/monitoring notice.
    for(const slug of ['video-walkthrough-terms','device-permissions-privacy','recording-consent'] as const){
      if(!await hasCurrentLegalAcceptance(admin,user.id,slug)){
        return json({error:'legal_acceptance_required',message:'Please accept the walkthrough terms, device permissions notice, and recording notice before joining.'},403);
      }
    }
    const {data:w}=await admin.from('video_walkthroughs').select('*,listing:listings(title)').eq('id',walkthrough_id).maybeSingle();
    if(!w || (w.buyer_id!==user.id && w.seller_id!==user.id))return json({error:'not_authorized'},403);
    if(!['scheduled','rescheduled'].includes(w.status))return json({error:'walkthrough_not_active'},409);
    const now=Date.now(), start=+new Date(w.starts_at), end=+new Date(w.ends_at);
    if(now<start-10*60_000 || now>end+30*60_000)return json({error:'outside_join_window',starts_at:w.starts_at,ends_at:w.ends_at},403);
    const provider=getVideoProvider(w.provider);
    let {data:room}=await admin.from('video_walkthrough_provider_rooms').select('*').eq('walkthrough_id',w.id).maybeSingle();
    const roomExpiry=new Date(end+30*60_000);
    const sameSchedule = room?.scheduled_starts_at && +new Date(room.scheduled_starts_at)===+new Date(w.starts_at);
    if(!room || !sameSchedule){
      if(room?.room_name) await provider.deleteRoom(room.room_name).catch(()=>undefined);
      const created=await provider.createPrivateRoom(w.id,roomExpiry);
      const {data:saved,error}=await admin.from('video_walkthrough_provider_rooms').upsert({walkthrough_id:w.id,provider:'daily',room_name:created.roomName,room_url:created.roomUrl,scheduled_starts_at:w.starts_at,expires_at:created.expiresAt},{onConflict:'walkthrough_id'}).select().single();
      if(error)throw error; room=saved;
    }
    const {data:p}=await admin.from('profiles').select('full_name,display_name,business_name').eq('id',user.id).maybeSingle();
    const joinExpiry=new Date(Math.min(roomExpiry.getTime(),Date.now()+45*60_000));
    const join=await provider.createMeetingToken(room.room_name,{id:user.id,name:p?.display_name||p?.business_name||p?.full_name||'Vendibook member'},joinExpiry,user.id===w.seller_id);
    // A join token is NOT a meeting join. The truthful event here is that
    // access was granted; real joins arrive from the Daily join hook.
    await admin.from('video_walkthrough_events').insert({walkthrough_id:w.id,actor_id:user.id,event_type:'access_granted',metadata:{role:user.id===w.seller_id?'seller':'buyer',source:'join_token_issued'}});
    return json({ ...join, role:user.id===w.seller_id?'seller':'buyer' });
  } catch(e) {
    if(e instanceof VideoProviderUnavailableError)return json({error:'provider_unavailable',message:e.message},503);
    console.error('[video-walkthrough-access]',e instanceof Error?e.message:'request failed');
    return json({error:'video_unavailable',message:'The walkthrough could not be opened safely.'},500);
  }
});