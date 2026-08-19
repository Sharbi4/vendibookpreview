// Light Vendibook email tokens — clean white card, charcoal type, soft
// dividers, restrained orange CTA. Used by the membership lifecycle emails so
// they read like the redesigned for-sale surfaces rather than the dark
// editorial templates.
export const ORANGE = '#FF5124'

export const l = {
  main: { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '28px 0' } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '0 18px' } as const,
  wordmark: { fontSize: '20px', letterSpacing: '-0.01em', color: '#1c1917', fontWeight: 700, margin: 0, textAlign: 'center' as const },
  wordmarkLink: { color: '#1c1917', textDecoration: 'none' } as const,
  headerWrap: { padding: '0 0 20px' } as const,
  card: { backgroundColor: '#ffffff', border: '1px solid #e7e2dc', borderRadius: '18px', padding: '32px 28px' } as const,
  kicker: { fontSize: '10px', letterSpacing: '0.22em', color: ORANGE, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const },
  h1: { fontSize: '25px', lineHeight: 1.2, fontWeight: 700, color: '#1c1917', margin: '0 0 12px', letterSpacing: '-0.015em' } as const,
  lede: { fontSize: '15.5px', lineHeight: 1.6, color: '#57534e', margin: '0 0 22px' } as const,
  text: { fontSize: '15px', lineHeight: 1.65, color: '#44403c', margin: '0 0 16px' } as const,
  small: { fontSize: '13px', lineHeight: 1.55, color: '#78716c', margin: '0 0 10px' } as const,
  panel: { backgroundColor: '#faf8f5', border: '1px solid #ece7e1', borderRadius: '14px', padding: '18px 20px', margin: '0 0 22px' } as const,
  row: { padding: '6px 0' } as const,
  label: { fontSize: '10px', letterSpacing: '0.18em', color: '#8a827a', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' as const },
  value: { fontSize: '16px', color: '#1c1917', fontWeight: 600, margin: 0 } as const,
  valueAccent: { fontSize: '16px', color: ORANGE, fontWeight: 700, margin: 0 } as const,
  ctaWrap: { margin: '6px 0 4px' } as const,
  button: { backgroundColor: ORANGE, color: '#ffffff', padding: '13px 26px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' } as const,
  hr: { borderColor: '#ece7e1', margin: '24px 0 18px' } as const,
  sectionLabel: { fontSize: '11px', letterSpacing: '0.18em', color: '#8a827a', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const },
  listItem: { fontSize: '14.5px', color: '#44403c', margin: '0 0 8px', lineHeight: 1.55 } as const,
  footnote: { fontSize: '12px', color: '#8a827a', textAlign: 'center' as const, margin: '20px 0 0', lineHeight: 1.6 } as const,
  link: { color: ORANGE, textDecoration: 'underline' } as const,
}
