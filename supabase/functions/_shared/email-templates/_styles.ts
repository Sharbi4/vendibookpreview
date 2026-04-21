// Shared Vendibook email design tokens — premium dark editorial.
// Mirrors transactional-email-templates/_styles.ts so auth and app
// emails are visually identical. Body background MUST stay white.
export const s = {
  main: { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '32px 0' } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '0 20px' } as const,
  brandBar: { padding: '0 0 20px' } as const,
  brandMark: { fontSize: '12px', letterSpacing: '0.32em', color: '#0a0a0a', fontWeight: 700, margin: 0 } as const,
  card: { backgroundColor: '#0a0a0a', color: '#fafafa', borderRadius: '16px', padding: '40px 36px', border: '1px solid #1a1a1a' } as const,
  kicker: { fontSize: '10px', letterSpacing: '0.28em', color: '#FF5124', fontWeight: 700, margin: '0 0 14px' } as const,
  h1: { fontSize: '28px', lineHeight: 1.15, fontWeight: 600, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.02em' } as const,
  lede: { fontSize: '15px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 28px' } as const,
  text: { fontSize: '14px', lineHeight: 1.65, color: '#d4d4d4', margin: '0 0 20px' } as const,
  emphasis: { color: '#ffffff' } as const,
  accentRow: { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '10px', padding: '16px 18px', margin: '0 0 24px' } as const,
  accentLabel: { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', margin: '0 0 4px', fontWeight: 600 } as const,
  accentValue: { fontSize: '15px', color: '#ffffff', fontWeight: 600, margin: 0 } as const,
  accentValueMuted: { fontSize: '14px', color: '#a3a3a3', margin: '0 0 12px' } as const,
  ctaWrap: { margin: '4px 0 24px' } as const,
  button: { backgroundColor: '#FF5124', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' } as const,
  smallText: { fontSize: '12px', color: '#737373', margin: '0 0 6px' } as const,
  linkUrl: { fontSize: '12px', color: '#a3a3a3', textDecoration: 'underline', wordBreak: 'break-all' as const } as const,
  hr: { borderColor: '#1f1f1f', margin: '28px 0 20px' } as const,
  footer: { fontSize: '12px', color: '#737373', margin: '0 0 6px' } as const,
  footerBrand: { fontSize: '11px', color: '#525252', margin: 0 } as const,
  codeBox: { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '12px', padding: '24px', textAlign: 'center' as const, margin: '0 0 24px' } as const,
  code: { fontFamily: '"SF Mono", Menlo, Monaco, Courier, monospace', fontSize: '32px', fontWeight: 600 as const, color: '#FF5124', letterSpacing: '0.3em', margin: 0 } as const,
}
