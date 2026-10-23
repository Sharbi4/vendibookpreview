import { expect, it } from 'vitest';
import { configuredAllisonAgentId, mergeAllisonGuidance } from '../../../supabase/functions/_shared/allisonAgent';

it('accepts only the owner-created Allison and rejects the old duplicate or missing setup', () => {
  expect(configuredAllisonAgentId('agent_8301m5nh7dq6e1x9wgqk2yx7k4pd')).toBe('agent_8301m5nh7dq6e1x9wgqk2yx7k4pd');
  expect(configuredAllisonAgentId('agent_9901m5nh7kg2en49an6sm8h55208')).toBeUndefined();
  expect(configuredAllisonAgentId(undefined)).toBeUndefined();
});

it('retains custom guidance and replaces only the managed support rules on re-sync', () => {
  const once = mergeAllisonGuidance('Custom customer-success guidance', 'Old support rules');
  const twice = mergeAllisonGuidance(once, 'Updated support rules');
  expect(twice).toContain('Custom customer-success guidance');
  expect(twice).toContain('Updated support rules');
  expect(twice).not.toContain('Old support rules');
});