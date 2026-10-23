import { expect, it } from 'vitest';
import { ALLISON_TOOL_DEFINITIONS, ALLISON_TOOL_NAMES } from '@/lib/atlas/allisonConfig';
it('exposes all support tools and no sales transaction tools', () => {
  expect(ALLISON_TOOL_DEFINITIONS.map(t => t.name).sort()).toEqual([...ALLISON_TOOL_NAMES].sort());
  for (const name of ['send_seller_message','draft_offer','start_request_to_buy','transfer_to_support']) expect(ALLISON_TOOL_DEFINITIONS.some(t => t.name === name)).toBe(false);
});
