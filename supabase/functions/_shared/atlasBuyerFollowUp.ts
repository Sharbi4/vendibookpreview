/** Specific requested follow-up consent, never marketing/SMS consent. */
export function buyerFollowUpConsent(body: Record<string, unknown>, now: Date) {
  if (body.intent !== 'buyer_follow_up') return { error: null, lines: [] as string[] };
  if (body.follow_up_consent !== true || body.consent_version !== 'atlas-buyer-follow-up-v1') {
    return { error: 'Please agree to the email follow-up before submitting.', lines: [] as string[] };
  }
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email.trim())) {
    return { error: 'Enter a valid email for your requested follow-up.', lines: [] as string[] };
  }
  const ids = Array.isArray(body.shortlist) ? body.shortlist.slice(0, 6).map(v => (v as { id?: unknown })?.id).filter(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) : [];
  return { error: null, lines: [
    'Purpose: buyer-requested email follow-up on shortlist / buying questions.',
    `Consent recorded: ${now.toISOString()} · atlas-buyer-follow-up-v1 · buyer-submitted form.`,
    'Scope: this inquiry only. No newsletter, SMS, automated promotional sequence or unrelated outreach permission. Stop if the buyer declines further contact.',
    ...ids.map(id => `Shortlist: https://vendibook.com/listing/${id}`),
  ] };
}
