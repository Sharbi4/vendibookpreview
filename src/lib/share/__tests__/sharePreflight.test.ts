import { describe, expect, it } from 'vitest';
import { checkImage, checkTitle, checkLink, summarize } from '../sharePreflight';

describe('share preflight', () => {
  it('fails a broken image', () => {
    expect(checkImage({ ok: false, width: 0, height: 0, reason: 'error' }).status).toBe('fail');
  });
  it('warns on a small image', () => {
    expect(checkImage({ ok: true, width: 320, height: 200 }).status).toBe('warn');
  });
  it('passes a good image', () => {
    expect(checkImage({ ok: true, width: 1200, height: 800 }).status).toBe('pass');
  });
  it('validates titles', () => {
    expect(checkTitle('').status).toBe('fail');
    expect(checkTitle('x'.repeat(90)).status).toBe('warn');
    expect(checkTitle('2019 Ford food truck').status).toBe('pass');
  });
  it('validates links', () => {
    expect(checkLink({ ok: false, reason: 'not_public' }, 'https://vendibook.com/listing/1').status).toBe('fail');
    expect(checkLink({ ok: true }, 'https://vendibook.com/listing/1').status).toBe('pass');
  });
  it('blocks sharing when any check fails', () => {
    const s = summarize([
      checkImage({ ok: true, width: 1200, height: 800 }),
      checkTitle('2019 Ford food truck'),
      checkLink({ ok: false, reason: 'not_found' }, 'https://vendibook.com/listing/1'),
    ]);
    expect(s.blocked).toBe(true);
    expect(s.verified).toBe(false);
  });
});
