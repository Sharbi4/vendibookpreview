import { describe, expect, it } from 'vitest';
import { buildWalkthroughCampaignHtml, buildWalkthroughCampaignText, WALKTHROUGH_SETUP, WALKTHROUGH_SHORT } from '../../../supabase/functions/_shared/marketing-templates/activate-walkthroughs';

describe('walkthrough activation marketing email', () => {
  const data = { firstName: '<Host & owner>', unsubscribeUrl: 'https://example.org/unsubscribe?token=test' };
  it('uses the working scheduling route and email-safe linked video in both formats', () => {
    const html = buildWalkthroughCampaignHtml(data);
    const text = buildWalkthroughCampaignText(data);
    expect(WALKTHROUGH_SETUP).toContain('/dashboard/account/scheduling?');
    expect(html).toContain('Activate live walkthroughs');
    expect(html).toContain(WALKTHROUGH_SHORT);
    expect(text).toContain(WALKTHROUGH_SHORT);
    expect(text).toContain(WALKTHROUGH_SETUP);
    expect(html).not.toMatch(/<(iframe|video|script)\b/i);
    expect(Buffer.byteLength(html)).toBeLessThan(102 * 1024);
  });
  it('escapes personalization and retains unsubscribe and recording notice', () => {
    const html = buildWalkthroughCampaignHtml(data);
    expect(html).toContain('&lt;Host &amp; owner&gt;');
    expect(html).not.toContain('<Host & owner>');
    expect(html).toContain(data.unsubscribeUrl);
    expect(html).toContain('consent requested before joining');
    expect(html).toContain('vendibook-logo-email-2026-10.png');
  });
});
