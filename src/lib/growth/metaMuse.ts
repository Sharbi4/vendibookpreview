import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
export interface Lead {id:string;revision:number;name:string;contact:string;intent:'buy'|'rent'|'sell';category:string|null;city:string|null;budget_max:number|null;start_date:string|null;end_date:string|null;source_kind:'voluntary'|'manual_authorized';provenance:string;consent_evidence:string;contact_channel:'email'|'phone'|'messenger';contact_allowed:boolean;do_not_contact:boolean;next_follow_up:string|null;stage:string;notes:string}
export interface Draft {id:string;lead_id:string;body:string;status:'draft'|'approved'|'rejected';revision:number;generator:string;approved_at:string|null}
export async function leadAction(action:string,payload:Record<string,unknown>) {const {data,error}=await supabase.rpc('meta_muse_action',{_action:action,_payload:JSON.parse(JSON.stringify(payload)) as Json});if(error)throw new Error(error.message);return data;}
export async function museRequest(action:'status'|'matches'|'template'|'muse',lead_id?:string) {
 const {data,error}=await supabase.functions.invoke('meta-muse-draft',{body:{action,...(lead_id?{lead_id}:{})}});
 if(error){ let message='Lead service unavailable';try {const detail=await error.context?.json();message=detail?.error??message;}catch{}throw new Error(message);}return data;
}
