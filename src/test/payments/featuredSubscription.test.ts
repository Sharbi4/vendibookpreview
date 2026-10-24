import { beforeEach, expect, it, vi } from 'vitest';
import { syncSquareSubscription } from '../../../supabase/functions/_shared/squareSubscription';
import { classifyProduct } from '../../../supabase/functions/_shared/productEntitlement';
const mocks = vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../../supabase/functions/_shared/square.ts',()=>({squareConfig:()=>({environment:'production',locationId:'location'}),squareRequest:mocks.request}));
const attempt={id:'attempt',subscription_id:'sub',environment:'production',customer_id:'customer',variation_id:'plan',tier:'featured_listing_monthly',listing_id:'listing'};
const subscription={id:'sub',customer_id:'customer',plan_variation_id:'plan',location_id:'location',status:'ACTIVE',invoice_ids:['invoice'],charged_through_date:'2099-01-01'};
function database(sold=false){const eq=vi.fn().mockResolvedValue({error:null});return {rpc:vi.fn(async(name:string)=>({data:name==='featured_listing_sold'?sold:null,error:null})),from:vi.fn(()=>({update:vi.fn(()=>({eq})),upsert:vi.fn().mockResolvedValue({error:null})}))};}
beforeEach(()=>mocks.request.mockReset());
it('classifies annual Pro as Pro and Featured without membership access',()=>{
 expect(classifyProduct({slug:'vendibook_pro_annual',billing_type:'recurring'}).grantsTier).toBe('pro');
 expect(classifyProduct({slug:'featured_listing_monthly',billing_type:'recurring'}).grantsTier).toBeUndefined();
});
it('grants a paid Featured period without changing Pro',async()=>{
 mocks.request.mockResolvedValueOnce({subscription}).mockResolvedValueOnce({invoice:{status:'PAID',primary_recipient:{customer_id:'customer'}}});
 const db=database();await syncSquareSubscription(db,attempt);
 expect(db.rpc).toHaveBeenCalledWith('apply_featured_subscription_period',{p_attempt:'attempt',p_paid_through:'2099-01-01T23:59:59.000Z'});
 expect(db.from).not.toHaveBeenCalledWith('host_subscriptions');
});
it('does not activate Featured for an unpaid invoice',async()=>{
 mocks.request.mockResolvedValueOnce({subscription}).mockResolvedValueOnce({invoice:{status:'UNPAID',primary_recipient:{customer_id:'customer'}}});
 const db=database();await syncSquareSubscription(db,attempt);
 expect(db.rpc.mock.calls.map(c=>c[0])).not.toContain('apply_featured_subscription_period');
});
it('cancels a sold listing at Square, without canceling membership',async()=>{
 mocks.request.mockResolvedValueOnce({subscription}).mockResolvedValueOnce({subscription:{...subscription,canceled_date:'2026-11-01',invoice_ids:[]}});
 const db=database(true);await syncSquareSubscription(db,attempt);
 expect(mocks.request).toHaveBeenCalledWith('/v2/subscriptions/sub/cancel',{});
 expect(db.from).not.toHaveBeenCalledWith('host_subscriptions');
});
it('retains a failed sold cancellation for retry',async()=>{
 mocks.request.mockResolvedValueOnce({subscription}).mockRejectedValueOnce(new Error('temporary outage'));
 const db=database(true);await expect(syncSquareSubscription(db,attempt)).rejects.toThrow('temporary outage');
 expect(db.from).not.toHaveBeenCalled();
});
