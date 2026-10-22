import { describe, expect, it } from 'vitest';
import { validateUpdateSignup, ROLE_CONTENT } from '../../../supabase/functions/_shared/updatePreferences';
import { updateConfirmationEmail } from '../../../supabase/functions/_shared/marketing-templates/updateConfirmation';
const input={email:' Reader@Example.org ',name:'Jamie',role:'buyer',zip:'85701',topics:['listings','news'],emailConsent:true};
describe('update opt-in boundaries',()=>{
  it('normalizes email and keeps optional texts off',()=>expect(validateUpdateSignup(input)).toMatchObject({email:'reader@example.org',phone:null,smsConsent:false}));
  it('requires explicit and independent channel consent',()=>{
    expect(()=>validateUpdateSignup({...input,emailConsent:false})).toThrow(/email updates/);
    expect(()=>validateUpdateSignup({...input,phone:'5205550123'})).toThrow(/Agree to SMS/);
    expect(validateUpdateSignup({...input,phone:'5205550123',smsConsent:true})).toMatchObject({phone:'+15205550123',smsConsent:true});
  });
  it('rejects invalid roles, topics, locations and phone numbers',()=>{
    for(const extra of [{role:'admin'},{topics:['payments']},{topics:[]},{zip:'Tucson'},{phone:'123',smsConsent:true}])expect(()=>validateUpdateSignup({...input,...extra})).toThrow();
  });
  it('routes buyer and renter content separately',()=>{expect(ROLE_CONTENT.buyer.href).toBe('/search?mode=sale');expect(ROLE_CONTENT.renter.href).toBe('/search?mode=rent');expect(ROLE_CONTENT.host.detail).not.toBe(ROLE_CONTENT.seller.detail);});
  it('uses the shared branded email, escapes customer input, and includes functional confirmation/unsubscribe links',()=>{
    const email=updateConfirmationEmail({name:'<script>bad</script>',role:'buyer',zip:'85701',topics:['listings'],confirmUrl:'https://vendibook.com/updates/confirm#token=example',unsubscribeUrl:'https://example.org/unsubscribe?t=signed'});
    expect(email.html).not.toContain('<script>bad</script>');expect(email.html).toContain('&lt;script&gt;');expect(email.html).toContain('Confirm my updates');expect(email.html).toContain('unsubscribe?t=signed');expect(email.text).toContain('#token=example');expect(email.html).toContain('1 S Church Ave');
  });
});
