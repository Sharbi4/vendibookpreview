import { describe,it,expect } from 'vitest';
import { catalogPrice,verifySquareSignature } from '../../../supabase/functions/_shared/square';
describe('Square billing security',()=>{
  it('uses the server catalog and only active promotions',()=>{
    const product={price_cents:5000,promo_price_cents:2500,promo_starts_at:'2026-01-01',promo_ends_at:'2026-02-01'};
    expect(catalogPrice(product,Date.parse('2026-01-15'))).toBe(2500);
    expect(catalogPrice(product,Date.parse('2026-03-01'))).toBe(5000);
    expect(()=>catalogPrice({price_cents:-1})).toThrow();
  });
  it('validates Square HMAC against the exact raw body and notification URL',async()=>{
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-key'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const raw='{"event_id":"test"}',url='https://example.com/square-webhook';
    const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(url+raw)))));
    expect(await verifySquareSignature(raw,signature,'test-key',url)).toBe(true);
    expect(await verifySquareSignature(raw+' ',signature,'test-key',url)).toBe(false);
    expect(await verifySquareSignature(raw,signature,'test-key',url+'/')).toBe(false);
    expect(await verifySquareSignature(raw,'malformed','test-key',url)).toBe(false);
  });
});
