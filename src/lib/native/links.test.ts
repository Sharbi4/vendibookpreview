import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ native: true }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native } }));
import { parseAppLink, publicReturnUrl } from '@/lib/native/links';
describe('Android links', () => {
  it.each(['https://vendibook.com/payment/return?token=123&x=2', 'https://www.vendibook.com/reset-password#access_token=test'])('preserves trusted URL %s', url => expect(parseAppLink(url)?.href).toBe(url));
  it.each(['https://vendibook.com.evil.test/x','https://evil.test/vendibook.com/x','http://vendibook.com/x','https://user@vendibook.com/x','https://vendibook.com:444/x','https://vendibook.com//evil.test','invalid'])('rejects %s', url => expect(parseAppLink(url)).toBeNull());
  it('uses public URLs for native email links and preserves checkout return paths', () => {
    expect(publicReturnUrl('/payment/return?token=123')).toBe('https://vendibook.com/payment/return?token=123');
    expect(publicReturnUrl('//evil.test')).toBe('https://vendibook.com/dashboard');
  });
  it('preserves browser origin on the website', () => {
    state.native = false;
    expect(publicReturnUrl('/reset-password')).toBe(window.location.origin + '/reset-password');
    state.native = true;
  });
});
