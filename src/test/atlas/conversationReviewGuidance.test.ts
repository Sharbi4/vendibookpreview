import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ATLAS_SYSTEM_PROMPT } from '@/lib/atlas/atlasConfig';
import { ALLISON_SYSTEM_PROMPT } from '@/lib/atlas/allisonConfig';

// The Nov 7, 2026 conversation-review section is live on all three agents.
// Git must keep it so re-copying instructions from source does not drop it.
const START = '## CONVERSATION REVIEW GUIDANCE (Nov 7, 2026)';
const END = '## END CONVERSATION REVIEW GUIDANCE';
const phone = readFileSync('docs/atlas/phone-agent-system-prompt.txt', 'utf8');
const section = (prompt: string) => prompt.slice(prompt.indexOf(START), prompt.indexOf(END) + END.length);

describe('Nov 7 conversation review guidance is preserved in source', () => {
  const prompts = { atlas: ATLAS_SYSTEM_PROMPT, allison: ALLISON_SYSTEM_PROMPT, phone };

  it.each(Object.entries(prompts))('%s carries the section exactly once, after the existing rules', (_name, prompt) => {
    expect(prompt.split(START).length - 1).toBe(1);
    expect(prompt.split(END).length - 1).toBe(1);
    expect(prompt.trimEnd().endsWith(END)).toBe(true);
    expect(prompt).not.toContain('SELLER INTENT AND SUPPORT');
  });

  it('website agents share one identical section', () => {
    expect(section(ATLAS_SYSTEM_PROMPT)).toBe(section(ALLISON_SYSTEM_PROMPT));
  });

  it('gives the two-business-hour timing only after the follow-up tool succeeds', () => {
    expect(section(ATLAS_SYSTEM_PROMPT)).toContain("don't give the two-business-hour guidance, until request_follow_up has succeeded");
    expect(section(phone)).toContain("don't give the two-business-hour guidance, until request_live_follow_up has succeeded");
  });

  it.each(Object.entries(prompts))('%s keeps carts, email confirmation and Spanish rules', (_name, prompt) => {
    const s = section(prompt);
    expect(s).toContain('Carts & Equipment (food_cart)');
    expect(s).toContain('ice_cream_dessert');
    expect(s).toMatch(/spell the email/);
    expect(s).toContain('Monday to Friday, 8 AM to 8 PM Eastern');
  });

  it('exported prompt files match the source prompts', () => {
    expect(readFileSync('docs/atlas/atlas-system-prompt.txt', 'utf8')).toBe(`${ATLAS_SYSTEM_PROMPT}\n`);
    expect(readFileSync('docs/atlas/allison-system-prompt.txt', 'utf8')).toBe(`${ALLISON_SYSTEM_PROMPT}\n`);
  });
});
