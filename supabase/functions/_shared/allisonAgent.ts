/** Owner-selected provider identity; fail closed until the saved configuration matches. */
export const OWNER_ALLISON_AGENT_ID = 'agent_8301m5nh7dq6e1x9wgqk2yx7k4pd';
export function configuredAllisonAgentId(saved: string | undefined): string | undefined {
  return saved === OWNER_ALLISON_AGENT_ID ? saved : undefined;
}

/** This agent was cloned from Atlas; inherited sales instructions must be replaced, not appended. */
export function mergeAllisonGuidance(_existing: string, support: string): string {
  return support;
}