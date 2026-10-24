import { expect, it } from 'vitest';
import { ALLISON_TOOL_DEFINITIONS, ALLISON_TOOL_NAMES } from '@/lib/atlas/allisonConfig';
it('exposes support and customer-reviewed sales tools without direct sending', () => {
  expect(ALLISON_TOOL_DEFINITIONS.map(t => t.name).sort()).toEqual([...ALLISON_TOOL_NAMES].sort());
  for (const name of ['send_seller_message','transfer_to_support']) expect(ALLISON_TOOL_DEFINITIONS.some(t => t.name === name)).toBe(false);
});
