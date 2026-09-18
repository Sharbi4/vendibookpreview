/**
 * Mints a per-participant join token for a Vendibook meeting.
 *
 * The room and the token are built from the meeting type's room profile — the
 * caller cannot influence room settings. A token never outlives the room, is
 * bound to one user, and normal participants are never room owners.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { hasCurrentLegalAcceptance } from '../_shared/legalVersions.ts';
import { getVideoProvider, VideoProviderUnavailableError } from '../_shared/videoProvider.ts';
import { ROOM_PROFILE_VERSION, meetingWindow, roleForUser, roomProfileFor } from '../_shared/videoMeetings.ts';
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
    if(!w)return json({error:'not_authorized'},403);

    const isParticipant = w.buyer_id===user.id || w.seller_id===user.id;
    const {data:adminRole}=await admin.rpc('has_role',{_user_id:user.id,_role:'admin'});
    const isModerator = w.meeting_type==='support_dispute' && Boolean(adminRole);
    if(!isParticipant && !isModerator)return json({error:'not_authorized'},403);
    if(!['scheduled','rescheduled'].includes(w.status))return json({error:'walkthrough_not_active'},409);

    const profile=roomProfileFor(w.meeting_type);
    const {nbf,exp}=meetingWindow(profile,w.starts_at,w.ends_at);
    const now=Date.now();
    if(now<nbf.getTime() || now>exp.getTime())return json({error:'outside_join_window',starts_at:w.starts_at,ends_at:w.ends_at},403);

    // Explicit recording consent for THIS meeting is required before a token
    // is issued; refusal simply means no token and no entry.
    if(isParticipant){
      const {data:consent}=await admin.from('video_walkthrough_consents').select('id')
        .eq('walkthrough_id',w.id).eq('user_id',user.id).eq('recording_consent_granted',true).limit(1);
      if(!Array.isArray(consent)||consent.length===0){
        return json({error:'recording_consent_required',message:'Please confirm you agree to participate in this recorded video walkthrough.'},403);
      }
    }

    const provider=getVideoProvider(w.provider);
    // The room name is stable forever; a reschedule PATCHes the same room.
    const room=await provider.ensureRoom(w.id,profile,nbf,exp);
    const {data:saved,error:saveError}=await admin.from('video_walkthrough_provider_rooms').upsert({
      walkthrough_id:w.id,
      provider:'daily',
      room_name:room.roomName,
      room_url:room.roomUrl,
      meeting_type:profile.meetingType,
      scheduled_starts_at:w.starts_at,
      scheduled_ends_at:w.ends_at,
      nbf_at:room.notBefore,
      expires_at:room.expiresAt,
      room_profile_version:ROOM_PROFILE_VERSION,
      join_hook_configured:Boolean(Deno.env.get('DAILY_JOIN_HOOK_SECRET')),
    },{onConflict:'walkthrough_id'}).select().single();
    if(saveError)throw saveError;

    const {data:p}=await admin.from('profiles').select('full_name,display_name,business_name').eq('id',user.id).maybeSingle();
    // A token may never outlive the room.
    const tokenExpiry=new Date(Math.min(exp.getTime(),Date.now()+45*60_000));
    const join=await provider.createMeetingToken(
      saved.room_name,
      {id:user.id,name:p?.display_name||p?.business_name||p?.full_name||'Vendibook member'},
      profile,
      {moderator:isModerator,notBefore:new Date(Math.min(Date.now(),nbf.getTime())),expiresAt:tokenExpiry},
    );

    const role=isModerator?'admin':roleForUser(w.meeting_type,w,user.id);
    // A join token is NOT a meeting join. The truthful event here is that
    // access was granted; real joins arrive from the Daily join hook.
    await admin.from('video_walkthrough_events').insert({walkthrough_id:w.id,actor_id:user.id,event_type:'access_granted',metadata:{role,meeting_type:profile.meetingType,source:'join_token_issued'}});

    return json({ ...join, role, meetingType:profile.meetingType, meetingLabel:profile.label, moderator:isModerator });
  } catch(e) {
    if(e instanceof VideoProviderUnavailableError)return json({error:'provider_unavailable',message:e.message},503);
    console.error('[video-walkthrough-access]',e instanceof Error?e.message:'request failed');
    return json({error:'video_unavailable',message:'The walkthrough could not be opened safely.'},500);
  }
});
