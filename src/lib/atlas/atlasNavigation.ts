/** Conservative local stop detection; semantic variants use set_navigation. */
export function asksToPauseNavigation(text: string): boolean {
  const value = text.toLowerCase().replace(/[’]/g, "'").trim();
  return /^(?:please\s+)?stop[.!?]*$/.test(value) || /\b(?:stop|pause)\s+(?:(?:changing|moving|controlling)\s+(?:the\s+)?)?(?:pages?|navigation|scrolling|page control)\b/.test(value) || /\b(?:don't|do not)\s+(?:change|move|control|scroll)\s+(?:(?:the|my)\s+)?(?:pages?|screen)\b/.test(value) || /\bstay on (?:this|the current) page\b/.test(value);
}
