import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the real orchestration function with mocked provider/DB boundaries.
// Removing annotations here avoids loading Deno HTTP imports in Node.
const source = readFileSync('supabase/functions/_shared/squareAddonReconciliation.ts','utf8')
  .replace(/^import .*;\n/gm,'').replace(/: any\b/g,'').replace(/: string\b/g,'').replace(/export /g,'');
const config = { locationId:'LOC', environment:'production' };
const { reconcileSquareAddonPayment, reconcileSquareAddonByPaymentId } = new Function('squareConfig','squareRequest',
  source+'\nreturn {reconcileSquareAddonPayment,reconcileSquareAddonByPaymentId};')(
    () => config, async () => ({ payment: { id:'wrong-id' } }));
const attempt = { id:'96e10e24-08ec-4ccf-a24a-f00e99ab0e40', payment_id:'PAY', kind:'addon',
  environment:'production', amount_cents:4900,tax_cents:260,currency:'USD',purchase_id:'PURCHASE' };
const payment = { id:'PAY',reference_id:attempt.id,location_id:'LOC',status:'COMPLETED',
  amount_money:{amount:5160,currency:'USD'},total_money:{amount:5160,currency:'USD'},
  order_id:'ORDER',created_at:'2026-10-11T18:51:32Z' };
function db(rows=[attempt], fail=false) {
  const calls=[];
  return { calls, from() {
    const filters={};
    const query={select(){return query},eq(key,value){filters[key]=value;return query},
      async maybeSingle(){return {data:rows.find(row=>Object.entries(filters).every(([key,value])=>row[key]===value))??null,error:null}}};
    return query;
  },async rpc(name,args){calls.push({name,args});return {data:'RECORD',error:fail?{message:'storage failed'}:null}} };
}
let count=0;
async function test(name,run){await run();count++;console.log('PASS '+name)}
await test('completed payment creates canonical reconciliation',async()=>{
  const admin=db(); const result=await reconcileSquareAddonPayment(admin,payment,'test');
  assert.equal(result.outcome,'addon_completed');assert.equal(admin.calls.length,1);
  assert.equal(admin.calls[0].args.p_details.order_id,'ORDER');assert.equal(admin.calls[0].args.p_amount,5160);
});
await test('reference recovers webhook arriving before payment ID save',async()=>{
  const admin=db([{...attempt,payment_id:null}]);await reconcileSquareAddonPayment(admin,payment);assert.equal(admin.calls.length,1);
});
await test('payment ID recovers missing reference',async()=>{
  const admin=db();await reconcileSquareAddonPayment(admin,{...payment,reference_id:null});assert.equal(admin.calls.length,1);
});
for (const [name,patch] of [
  ['wrong location',{location_id:'OTHER'}],
  ['wrong amount',{amount_money:{amount:4900,currency:'USD'}}],
  ['wrong currency',{amount_money:{amount:5160,currency:'EUR'}}],
  ['unexpected tip/total',{total_money:{amount:5260,currency:'USD'}}],
  ['wrong reference',{reference_id:'another'}],
]) await test(name,async()=>{const admin=db();await assert.rejects(()=>reconcileSquareAddonPayment(admin,{...payment,...patch}));assert.equal(admin.calls.length,0)});
await test('sandbox and production isolated',async()=>{
  const admin=db([{...attempt,environment:'sandbox'}]);const result=await reconcileSquareAddonPayment(admin,payment);
  assert.equal(result.outcome,'ignored_unknown_addon');assert.equal(admin.calls.length,0);
});
await test('ambiguous linkage rejected',async()=>{
  const admin=db([attempt,{...attempt,id:'10000000-0000-4000-8000-000000000001',payment_id:null}]);
  await assert.rejects(()=>reconcileSquareAddonPayment(admin,{...payment,reference_id:'10000000-0000-4000-8000-000000000001'}));
  assert.equal(admin.calls.length,0);
});
await test('pending payment never fulfills',async()=>{
  const admin=db();await reconcileSquareAddonPayment(admin,{...payment,status:'APPROVED'});assert.equal(admin.calls.length,0);
});
await test('refunded payment never reactivates boost',async()=>{
  const admin=db();const result=await reconcileSquareAddonPayment(admin,{...payment,refunded_money:{amount:100}});
  assert.equal(result.outcome,'addon_refunded_requires_review');assert.equal(admin.calls.length,0);
});
await test('database error propagates for provider retry',async()=>{
  await assert.rejects(()=>reconcileSquareAddonPayment(db([attempt],true),payment),/storage failed/);
});
await test('provider response identity verified',async()=>{
  await assert.rejects(()=>reconcileSquareAddonByPaymentId(db(),'PAY'),/identity mismatch/);
});
const webhook=readFileSync('supabase/functions/square-rental-webhook/index.ts','utf8');
const handler=webhook.slice(webhook.indexOf('async function handlePayment('),webhook.indexOf('\nasync function handleRefund('))
  .replace(/: any\b/g,'').replace(/: string\b/g,'');
let billing=0,rental=0;
const handlePayment=new Function('reconcileSquareAddonByPaymentId','squareAccess','squareApi','finalizeCapture','squarePaymentFacts','CaptureRejectedError','Deno',
 handler+'\nreturn handlePayment;')(
 async()=>{billing++;return {outcome:'addon_completed'}},async()=>({}),async()=>({payment:{location_id:'LOC'}}),
 async()=>{rental++;return {payment_status:'completed'}},p=>p,Error,{env:{get:()=> 'LOC'}});
function routeDb(record,attemptRow=null){
  return {from(table){const q={select(){return q},eq(){return q},async maybeSingle(){return {data:table==='payment_records'?record:attemptRow,error:null}}};return q;}};
}
await test('known add-on never enters rental finalizer',async()=>{
  assert.equal(await handlePayment(routeDb({monetization_purchase_id:'PURCHASE'}),'PAY',{}),'addon_completed');
  assert.equal(billing,1);assert.equal(rental,0);
});
await test('missing ledger is recovered through checkout mapping',async()=>{
  assert.equal(await handlePayment(routeDb(null,{id:attempt.id}),'PAY',{}),'addon_completed');
  assert.equal(billing,2);assert.equal(rental,0);
});
await test('rental still uses existing finalizer',async()=>{
  assert.equal(await handlePayment(routeDb({square_location_id:'LOC'}),'PAY',{}),'payment_completed');
  assert.equal(rental,1);
});
console.log(count+' Square reconciliation tests passed');
