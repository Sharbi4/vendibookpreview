import { describe, it, expect } from 'vitest';
import { buildSaleDraftRow, isSafeSaleResumePath } from '@/lib/saleDraftRecovery';
import { buyerCommitted, saleResumeUrl } from '../../../supabase/functions/send-booking-abandonment-emails/saleRecovery';

describe('sale checkout abandonment', () => {
  it('a paid sale is never nudged', () => {
    expect(buyerCommitted(['paid'], 0)).toBe(true);
  });
  it('a submitted Request to Buy is never nudged', () => {
    expect(buyerCommitted([], 1)).toBe(true);
  });
  it('an unpaid pending PayPal checkout is still followed up', () => {
    expect(buyerCommitted(['pending'], 0)).toBe(false);
  });
  it('resume links stay on vendibook checkout', () => {
    expect(isSafeSaleResumePath('https://evil.com')).toBe(false);
    expect(saleResumeUrl('//evil.com', 'abc', false)).toBe('https://vendibook.com/checkout/abc');
    expect(saleResumeUrl(null, 'abc', true)).toBe('https://vendibook.com/purchase-request/abc');
  });
  it('a new checkout attempt re-arms both follow-ups', () => {
    const row = buildSaleDraftRow({ userId: 'u', listingId: 'l', email: ' A@B.com ', requestOnly: false });
    expect(row.email).toBe('a@b.com');
    expect(row.email_2h_sent_at).toBeNull();
    expect(row.completed_at).toBeNull();
  });
});
