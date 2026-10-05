// Contact details, links and off-platform payment/chat handles. Shared by
// notify-listing-lead (guest inquiries are held and masked) and the listing
// page (descriptions are masked for everyone but the owner) so deals and
// first contact stay on Vendibook, where messages are risk-scanned.
// Pure module: no imports, safe for Deno and the React app.
export const CONTACT_PATTERNS: RegExp[] = [
  /[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+(?:\s*\.\s*[a-z0-9-]+)+/gi,
  /[a-z0-9._%+-]+\s*(?:\(at\)|\[at\]|\sat\s)\s*[a-z0-9-]+\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}/gi,
  /(?:https?:\/\/|www\.)\S+/gi,
  /\b[a-z0-9-]+\.(?:com|net|org|io|co|me|ly|link|xyz|info|biz|app|site|online|shop)\b\S*/gi,
  // US-style phone numbers; digit boundaries keep year lists and prices out.
  /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
  /\b(?:whats\s?app|telegram|signal|wechat|cash\s?app|zelle|venmo|western\s?union|money\s?gram|gift\s?cards?)\b/gi,
]

export function hasContactDetails(text: string): boolean {
  return CONTACT_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(text) })
}

export function maskContactDetails(text: string, replacement = '[contact removed]'): string {
  return CONTACT_PATTERNS.reduce((t, re) => t.replace(re, replacement), text)
}
