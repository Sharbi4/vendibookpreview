import {describe,it,expect} from 'vitest';
import {referralFailure} from '../../../supabase/functions/_shared/paypalOnboardingError';
describe('seller referral authorization errors',()=>{
  it('reports the actual partner authorization blocker instead of generic 400',()=>{
    expect(referralFailure({status:403,issue:'NOT_AUTHORIZED'},'create_referral')).toMatchObject({status:503,code:'paypal_partner_access_required'});
  });
  it('never reports failed referral authorization as successful status refresh',()=>{
    for(const issue of ['AUTHORIZATION_ERROR','USER_BUSINESS_ERROR','NOT_AUTHORIZED']){
      expect(referralFailure({status:400,issue},'create_referral')?.status).toBe(503);
    }
  });
  it('leaves seller status and validation errors in their own handlers',()=>{
    expect(referralFailure({status:403,issue:'NOT_AUTHORIZED'},'refresh_status')).toBeNull();
    expect(referralFailure({status:422,issue:'INVALID_PARAMETER_VALUE'},'create_referral')).toBeNull();
  });
});
