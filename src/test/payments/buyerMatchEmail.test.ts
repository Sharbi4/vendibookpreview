import { beforeEach, describe, expect, it, vi } from 'vitest';
const send=vi.hoisted(()=>vi.fn());
vi.mock('../../../supabase/functions/_shared/invokeTransactionalEmail.ts',()=>({invokeTransactionalEmail:send}));
import { dispatchBuyerMatchEmails } from '../../../supabase/functions/_shared/buyerMatchEmail';
function client(enabled=true,optedOut=false) {
 const event={id:'digest-1',campaign_id:'campaign-1',report_id:'report-1'};
 return {
  rpc:vi.fn(async(name:string)=>({data:name==='claim_buyermatch_emails'?[event]:null,error:null})),
  from:vi.fn((table:string)=>({select:()=>({eq:()=>({
    single:async()=>({data:{seller_id:'seller-1',notifications_enabled:enabled},error:null}),
    maybeSingle:async()=>({data:{sale_email:!optedOut},error:null}),
  })})})),
  auth:{admin:{getUserById:vi.fn(async()=>({data:{user:{email:'seller@example.test'}},error:null}))}},
 };
}
beforeEach(()=>{send.mockReset();send.mockResolvedValue({error:null});});
describe('BuyerMatch report email',()=>{
 it('uses the existing template, stored seller recipient and stable digest key',async()=>{
  await dispatchBuyerMatchEmails(client());
  expect(send).toHaveBeenCalledWith(expect.objectContaining({templateName:'generic-notice',recipientEmail:'seller@example.test',idempotencyKey:'buyermatch-digest:digest-1'}));
  expect(send.mock.calls[0][0].templateData.ctaUrl).toContain('/dashboard/buyermatch?campaign=campaign-1');
 });
 it.each([[false,false],[true,true]])('honors campaign and account email preferences',async(enabled,optedOut)=>{
  await dispatchBuyerMatchEmails(client(enabled,optedOut));expect(send).not.toHaveBeenCalled();
 });
 it('retains failures for the maintenance retry',async()=>{
  send.mockResolvedValue({error:{message:'temporary'}});
  const db=client();expect((await dispatchBuyerMatchEmails(db)).failures).toBe(1);
  expect(db.rpc).toHaveBeenCalledWith('finish_buyermatch_email',expect.objectContaining({_error:expect.stringContaining('retry scheduled')}));
 });
});
