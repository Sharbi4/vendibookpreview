import { expect, it } from 'vitest';
import { configuredAllisonAgentId, mergeAllisonGuidance } from '../../../supabase/functions/_shared/allisonAgent';

it('accepts only the owner-created Allison and rejects the old duplicate or missing setup', () => {
  expect(configuredAllisonAgentId('agent_8301m5nh7dq6e1x9wgqk2yx7k4pd')).toBe('agent_8301m5nh7dq6e1x9wgqk2yx7k4pd');
  expect(configuredAllisonAgentId('agent_9901m5nh7kg2en49an6sm8h55208')).toBeUndefined();
  expect(configuredAllisonAgentId(undefined)).toBeUndefined();
});

it('replaces inherited Atlas sales prompting rather than retaining it on re-sync', () => {
  const once = mergeAllisonGuidance('You are Atlas. Send seller messages and draft offers.', 'Old support rules');
  const twice = mergeAllisonGuidance(once, 'Updated support rules');
  expect(once).toBe('Old support rules');
  expect(twice).toBe('Updated support rules');
});