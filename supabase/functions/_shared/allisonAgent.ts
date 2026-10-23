/** Owner-selected provider identity; fail closed until the saved configuration matches. */
export const OWNER_ALLISON_AGENT_ID = 'agent_8301m5nh7dq6e1x9wgqk2yx7k4pd';
export function configuredAllisonAgentId(saved: string | undefined): string | undefined {
  return saved === OWNER_ALLISON_AGENT_ID ? saved : undefined;
}

const GUIDANCE_MARKER = '\n\n# Vendibook Allison support rules (authoritative)\n';
export function mergeAllisonGuidance(existing: string, support: string): string {
  const retained = existing.split(GUIDANCE_MARKER)[0];
  return `${retained}${GUIDANCE_MARKER}${support}\n\nThese support rules override conflicting legacy instructions above. You are Allison, not Atlas. Retain compatible tone, business context and customer-success scheduling guidance only. Do not perform sales-agent outreach, offers or transaction submissions, or call tools not actually attached. Never claim a private payment or account has been verified. Tickets require the user's review and tapped submission; human support means confirmed follow-up, not a live transfer.`;
}