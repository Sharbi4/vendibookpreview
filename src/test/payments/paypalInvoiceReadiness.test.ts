import { describe, expect, it } from 'vitest';
import { invoiceSellerReadiness, sellerReferralFeatures } from '../../../supabase/functions/_shared/paypalInvoiceReadiness';
const sample = () => ({
  merchant_id:'SELLER', payments_receivable:true, primary_email_confirmed:true,
  products:[{name:'PPCP',vetting_status:'SUBSCRIBED'}],
  oauth_integrations:[{oauth_third_party:[{partner_client_id:'PLATFORM',scopes:['https://uri.paypal.com/services/payments/payment/authcapture']}]}],
  capabilities:[{name:'PARTNER_FEE',status:'ACTIVE'},{name:'DELAY_FUNDS_DISBURSEMENT',status:'ACTIVE'}],
});
const check=(raw:unknown,environment='live',client:string|null='PLATFORM')=>invoiceSellerReadiness(raw,'SELLER',client,environment);
describe('live invoice seller readiness',()=>{
  it('accepts fresh live merchant evidence with both active capabilities',()=>expect(check(sample())).toEqual({ready:true,reasons:[]}));
  it('rejects sandbox evidence',()=>expect(check(sample(),'sandbox').ready).toBe(false));
  it('rejects missing, foreign or mismatched merchant identities',()=>{
    expect(check({...sample(),merchant_id:null}).ready).toBe(false);
    expect(check({...sample(),merchant_id:'OTHER'}).ready).toBe(false);
    expect(check(sample(),'live','OTHER').ready).toBe(false);
    expect(check(sample(),'live',null).ready).toBe(false);
  });
  it('never treats cached names as approved capabilities',()=>{
    expect(check({...sample(),capabilities:['PARTNER_FEE','DELAY_FUNDS_DISBURSEMENT']}).ready).toBe(false);
    expect(check({...sample(),capabilities:[]}).ready).toBe(false);
  });
  it('rejects pending, revoked, missing and conflicting capability states',()=>{
    for(const status of ['IN_REVIEW','REVOKED','',undefined]){
      expect(check({...sample(),capabilities:[{name:'PARTNER_FEE',status:'ACTIVE'},{name:'DELAY_FUNDS_DISBURSEMENT',status}]}).ready).toBe(false);
    }
    expect(check({...sample(),capabilities:[...sample().capabilities,{name:'PARTNER_FEE',status:'REVOKED'}]}).ready).toBe(false);
  });
  it('keeps ordinary merchant authorization checks',()=>{
    expect(check({...sample(),payments_receivable:false}).ready).toBe(false);
    expect(check({...sample(),primary_email_confirmed:false}).ready).toBe(false);
    expect(check({...sample(),oauth_integrations:[]}).ready).toBe(false);
    expect(check(null).ready).toBe(false);
  });
  it('requests delayed disbursement features only with explicit opt-in',()=>{
    expect(sellerReferralFeatures(false)).not.toContain('PARTNER_FEE');
    expect(sellerReferralFeatures(true)).toEqual(expect.arrayContaining(['PARTNER_FEE','DELAY_FUNDS_DISBURSEMENT']));
  });
});
