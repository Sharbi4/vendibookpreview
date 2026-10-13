import { queueCommerceEmails } from "../_shared/commerceEmail.ts";
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { purchaseAcknowledged, PURCHASE_ACK_VERSION } from '../_shared/purchaseRequestPolicy.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405,'method_not_allowed','Use POST.');
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
    if(!token) return jsonError(401,'unauthenticated','Please sign in.');
    const {data:{user},error:authError}=await admin.auth.getUser(token);
    if(authError||!user)return jsonError(401,'unauthenticated','Please sign in.');
    const body=await req.json();
    const {data:config,error:configError}=await admin.from('commerce_rollout').select('*').eq('id',true).single();
    if(configError)return jsonError(503,'commerce_unavailable','Purchase requests are temporarily unavailable.');
    if(body.action==='config')return jsonResponse(200,{requests_enabled:config.requests_enabled,payments_enabled:config.payments_enabled});
    if(body.action==='submit') {
      if(!config.requests_enabled)return jsonError(409,'rollout_pending','Invoice purchases are not activated.');
      if(!purchaseAcknowledged(body.acknowledgement))return jsonError(400,'acknowledgment_required','Review and acknowledge the purchase process.');
      const {data,error}=await admin.rpc('commerce_submit_request',{_sale:body.sale_id,_actor:user.id,_ack_version:PURCHASE_ACK_VERSION,_acknowledged:true});
      if(error)return jsonError(409,'request_not_submitted',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,{request_id:data});
    }
    if(body.action==='request_action') {
      const {data,error}=await admin.rpc('commerce_request_action',{_request:body.request_id,_actor:user.id,_action:body.request_action,_revision:body.revision,_proposed:body.proposed_terms??null});
      if(error)return jsonError(409,'request_not_updated',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,data);
    }
    if(body.action==='cancel_invoice') {
      const {error}=await admin.rpc('commerce_cancel_invoice',{_invoice:body.invoice_id,_actor:user.id});
      if(error)return jsonError(409,'invoice_not_cancelled',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,{ok:true});
    }
    if(body.action==='review_tax') {
      const {error}=await admin.rpc('commerce_review_tax',{_request:body.request_id,_actor:user.id,_revision:body.revision,_tax:body.tax_cents,_jurisdiction:body.jurisdiction,_responsible:body.responsible_party,_classification:body.item_classification,_evidence:body.evidence_reference,_exemption:body.exemption_reference??null});
      if(error)return jsonError(409,'tax_not_reviewed',error.message);
      return jsonResponse(200,{ok:true});
    }
    // Manual invoicing (owner process 2026-10-13): admins send the invoice and
    // release the seller payment by hand, then record each step here. The RPCs
    // re-check the admin role, amounts and order of steps.
    if(body.action==='admin_record_invoice') {
      const {data,error}=await admin.rpc('commerce_record_invoice_sent',{_request:body.request_id,_actor:user.id,_equipment:body.equipment_cents,_delivery:body.delivery_cents??0,_freight:body.freight_cents??0,_tax:body.tax_cents??0,_fee:body.fee_cents,_due_days:body.due_days??7,_invoice_url:body.invoice_url??null,_invoice_reference:body.invoice_reference??null,_note:body.note??null,_tax_jurisdiction:body.tax_jurisdiction??null});
      if(error)return jsonError(409,'invoice_not_recorded',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,{invoice_id:data});
    }
    if(body.action==='admin_record_payment') {
      const {error}=await admin.rpc('commerce_record_payment',{_invoice:body.invoice_id,_actor:user.id,_reference:body.reference,_received_at:body.received_at??null});
      if(error)return jsonError(409,'payment_not_recorded',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,{ok:true});
    }
    if(body.action==='admin_record_release') {
      const {error}=await admin.rpc('commerce_record_release',{_invoice:body.invoice_id,_actor:user.id,_reference:body.reference});
      if(error)return jsonError(409,'release_not_recorded',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,{ok:true});
    }
    if(body.action==='admin_cancel') {
      const {error}=await admin.rpc('commerce_admin_cancel',{_request:body.request_id,_actor:user.id,_reason:body.reason});
      if(error)return jsonError(409,'request_not_cancelled',error.message);
      void queueCommerceEmails(admin,user.id);
      return jsonResponse(200,{ok:true});
    }
    return jsonError(400,'unknown_action','Choose a supported invoice action.');
  } catch(error){return unknownErrorResponse(error);}
});
