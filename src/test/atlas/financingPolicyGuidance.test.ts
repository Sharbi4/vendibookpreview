import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ATLAS_SYSTEM_PROMPT } from '@/lib/atlas/atlasConfig';
import { ALLISON_SYSTEM_PROMPT } from '@/lib/atlas/allisonConfig';

// The Nov 2026 APPROVE financing section is live on Atlas, Allison and the
// support phone line (verified 2026-11-07). Git keeps the same text so
// re-copying instructions from source does not drop or drift from it.
const START = '## CURRENT FINANCING POLICY (Nov 2026)';
const phone = readFileSync('docs/atlas/phone-agent-system-prompt.txt', 'utf8');
const prompts = { atlas: ATLAS_SYSTEM_PROMPT, allison: ALLISON_SYSTEM_PROMPT, phone };
const section = (prompt: string) => {
  const from = prompt.indexOf(START);
  return prompt.slice(from, prompt.indexOf('\n\n', from));
};

describe('APPROVE financing policy is preserved in source', () => {
  it.each(Object.entries(prompts))('%s carries the section exactly once, before the review guidance', (_n, prompt) => {
    expect(prompt.split(START).length - 1).toBe(1);
    expect(prompt.indexOf(START)).toBeLessThan(prompt.indexOf('## CONVERSATION REVIEW GUIDANCE (Nov 7, 2026)'));
  });

  it('all three agents share one identical section', () => {
    expect(section(ALLISON_SYSTEM_PROMPT)).toBe(section(ATLAS_SYSTEM_PROMPT));
    expect(section(phone)).toBe(section(ATLAS_SYSTEM_PROMPT));
  });

  it('applies only through the APPROVE hosted application, with no Vendibook form first', () => {
    const s = section(ATLAS_SYSTEM_PROMPT);
    expect(s).toContain('https://financing.approvepayments.com/vendibook');
    expect(s).toContain('"Apply with APPROVE" button');
    expect(s).toContain('There is no Vendibook form to fill out first');
  });

  it('forbids 550-score, 24/48-hour and guaranteed approval promises', () => {
    expect(section(ATLAS_SYSTEM_PROMPT)).toContain(
      'Never promise approval for a 550 credit score (or any score), approval within 24 or 48 hours, guaranteed approval',
    );
  });

  it('does not claim in-app financing status tracking', () => {
    expect(section(ATLAS_SYSTEM_PROMPT)).toContain("Vendibook can't show financing status in the app yet");
  });

  it('keeps financing approval separate from payment', () => {
    expect(section(ATLAS_SYSTEM_PROMPT)).toContain('A financing approval is not a payment and does not complete the purchase');
  });

  it('Atlas no longer pitches Equinox timing or PayPal Pay Later plans', () => {
    expect(ATLAS_SYSTEM_PROMPT).not.toContain('Equinox handles financing');
    expect(ATLAS_SYSTEM_PROMPT).not.toContain('explain Pay Later only if relevant');
    expect(ALLISON_SYSTEM_PROMPT).not.toContain('Do not offer PayPal installments on rentals.');
  });

  it('exported Atlas and Allison docs match the source prompts', () => {
    expect(readFileSync('docs/atlas/atlas-system-prompt.txt', 'utf8')).toBe(`${ATLAS_SYSTEM_PROMPT}\n`);
    expect(readFileSync('docs/atlas/allison-system-prompt.txt', 'utf8')).toBe(`${ALLISON_SYSTEM_PROMPT}\n`);
  });
});
