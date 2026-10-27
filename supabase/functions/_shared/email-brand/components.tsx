/// <reference types="npm:@types/react@18.3.23" />
// ─────────────────────────────────────────────────────────────
// VENDIBOOK MASTER EMAIL DESIGN SYSTEM — shared blocks
//
// Every block is email-client-safe: inline styles plus one shared <head>
// block (Poppins + Outlook Arial fallback, see ./bulletproof.ts),
// table-friendly React Email primitives, no JS, no background imagery.
// ─────────────────────────────────────────────────────────────

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME,
  HELP_URL,
  LOGO_ALT,
  LOGO_HEIGHT,
  LOGO_LIGHT_URL,
  LOGO_WIDTH,
  MAILING_ADDRESS,
  PRIVACY_URL,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  TERMS_URL,
  color,
  currentYear,
  t,
} from './tokens.ts'
import { brandHeadHtml, ctaButtonHtml, type CtaVariant } from './bulletproof.ts'

// ---- <head> ----------------------------------------------------------
/**
 * Shared <head> for every React Email template: charset/viewport/colour-scheme
 * metas, Poppins from Google Fonts (<link> + @import), a sans-serif font
 * reset on body/table/td/p/a/h1-h3 and the Outlook (mso) Arial override.
 * Rendered as raw HTML because React cannot emit conditional comments.
 */
export const BrandHead = () => (
  <head
    dangerouslySetInnerHTML={{
      __html:
        '<meta content="text/html; charset=UTF-8" http-equiv="Content-Type">' + brandHeadHtml(),
    }}
  />
)

// ---- Bulletproof CTA ---------------------------------------------------
const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

const isLightFill = (bg: unknown) =>
  typeof bg === 'string' && /^(#fff(fff)?|white|#faf7f2|#f7f4ef)$/i.test(bg.trim())

/**
 * Drop-in replacement for React Email's <Button>: same `href` / `style` /
 * children API, but renders the bulletproof orange glow pill (table + Outlook
 * VML). A white/ivory `style.backgroundColor` selects the secondary (outline)
 * pill; anything else is the primary CTA. Other `style` values are ignored so
 * every CTA matches the site button.
 */
export const EmailButton = ({
  href,
  children,
  style,
  variant,
  align,
}: {
  href: string
  children: React.ReactNode
  style?: React.CSSProperties
  variant?: CtaVariant
  align?: 'left' | 'center'
}) => {
  const v: CtaVariant = variant ?? (isLightFill(style?.backgroundColor) ? 'secondary' : 'primary')
  return (
    <div
      style={{ margin: 0, padding: 0 }}
      dangerouslySetInnerHTML={{ __html: ctaButtonHtml({ href, label: textOf(children).trim(), variant: v, align }) }}
    />
  )
}

// ---- Brand header ----------------------------------------------------
export const EmailHeader = ({
  align = 'left' as 'left' | 'center',
  width = LOGO_WIDTH,
}: { align?: 'left' | 'center'; width?: number }) => {
  const h = Math.round(width / (LOGO_WIDTH / LOGO_HEIGHT))
  return (
  <Section style={{ padding: '4px 0 16px', textAlign: align }}>
    <Link href={SITE_URL} style={{ textDecoration: 'none', display: 'inline-block' }}>
      <Img
        src={LOGO_LIGHT_URL}
        alt={LOGO_ALT}
        width={String(width)}
        height={String(h)}
        style={{
          display: 'block',
          border: 0,
          outline: 'none',
          width: `${width}px`,
          maxWidth: '100%',
          height: 'auto',
          margin: align === 'center' ? '0 auto' : '0',
        }}
      />
    </Link>
  </Section>
  )
}

// ---- Status chip (compact, purpose-specific) -------------------------
export const StatusChip = ({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'success' | 'brand' | 'warning'
}) => {
  const map = {
    neutral: { bg: color.surfaceMuted, fg: color.textSecondary, br: color.border },
    success: { bg: color.successBg, fg: color.success, br: color.successBorder },
    brand: { bg: '#fff1ec', fg: color.primaryDark, br: '#ffd6c9' },
    warning: { bg: color.warningBg, fg: color.warning, br: color.warningBorder },
  } as const
  const c = map[tone]
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, margin: '0 0 12px' }}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: c.bg,
              border: `1px solid ${c.br}`,
              borderRadius: '999px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: c.fg,
              fontFamily: t.text.fontFamily,
            }}
          >
            {label}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/** Compact secondary action: bold link + one line of context. */
export const ActionRow = ({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description?: string
}) => (
  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, width: '100%' }}>
    <tbody>
      <tr>
        <td style={{ padding: '10px 0', borderTop: `1px solid ${color.border}` }}>
          <Text style={{ margin: 0, fontSize: '15px', lineHeight: 1.4, fontWeight: 700, fontFamily: t.text.fontFamily }}>
            <Link href={href} style={{ color: color.primaryDark, textDecoration: 'none' }}>
              {title} &rsaquo;
            </Link>
          </Text>
          {description ? (
            <Text style={{ margin: '3px 0 0', fontSize: '13px', lineHeight: 1.5, color: color.textMuted, fontFamily: t.text.fontFamily }}>
              {description}
            </Text>
          ) : null}
        </td>
      </tr>
    </tbody>
  </table>
)


// ---- Typography ------------------------------------------------------
export const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <Text style={t.eyebrow}>{children}</Text>
)
export const H1 = ({ children }: { children: React.ReactNode }) => (
  <Heading as="h1" style={t.h1}>{children}</Heading>
)
export const H2 = ({ children }: { children: React.ReactNode }) => (
  <Heading as="h2" style={t.h2}>{children}</Heading>
)
export const Lede = ({ children }: { children: React.ReactNode }) => (
  <Text style={t.lede}>{children}</Text>
)
export const P = ({ children }: { children: React.ReactNode }) => (
  <Text style={t.text}>{children}</Text>
)
export const Small = ({ children }: { children: React.ReactNode }) => (
  <Text style={t.small}>{children}</Text>
)
export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={t.sectionLabel}>{children}</Text>
)
export const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <>
    {items.map((item, i) => (
      <Text key={i} style={t.listItem}>• {item}</Text>
    ))}
  </>
)
export const Divider = () => <Hr style={t.hr} />

// ---- Buttons ---------------------------------------------------------
export const CtaButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ margin: '4px 0 20px' }}>
    <EmailButton href={href} variant="primary">{children}</EmailButton>
  </Section>
)

export const SecondaryButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ margin: '0 0 20px' }}>
    <EmailButton href={href} variant="secondary">{children}</EmailButton>
  </Section>
)

/** Plain text link fallback under a CTA — helps when buttons are stripped. */
export const CtaFallback = ({ href, label = 'Or copy this link:' }: { href: string; label?: string }) => (
  <Text style={{ ...t.legal, wordBreak: 'break-all' as const }}>
    {label}{' '}
    <Link href={href} style={t.linkMuted}>{href}</Link>
  </Text>
)

// ---- Callouts --------------------------------------------------------
type CalloutTone = 'info' | 'success' | 'warning' | 'error'
const TONES: Record<CalloutTone, { bg: string; border: string; text: string }> = {
  info: { bg: color.surfaceMuted, border: color.border, text: color.text },
  success: { bg: color.successBg, border: color.successBorder, text: color.success },
  warning: { bg: color.warningBg, border: color.warningBorder, text: color.warning },
  error: { bg: color.errorBg, border: color.errorBorder, text: color.error },
}

export const Callout = ({
  tone = 'info',
  title,
  children,
}: {
  tone?: CalloutTone
  title?: string
  children?: React.ReactNode
}) => {
  const c = TONES[tone]
  return (
    <Section
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '12px',
        padding: '16px 18px',
        margin: '0 0 20px',
      }}
    >
      {title ? (
        <Text style={{ fontSize: '15px', fontWeight: 700, color: c.text, margin: '0 0 6px' }}>
          {title}
        </Text>
      ) : null}
      {children ? (
        <Text style={{ fontSize: '14px', lineHeight: 1.6, color: color.textSecondary, margin: 0 }}>
          {children}
        </Text>
      ) : null}
    </Section>
  )
}

// ---- Detail / transaction summary ------------------------------------
export interface DetailRow {
  label: string
  value?: React.ReactNode
  emphasis?: boolean
  mono?: boolean
}

export const DetailTable = ({ rows, title }: { rows: DetailRow[]; title?: string }) => {
  const visible = rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
  if (!visible.length) return null
  return (
    <Section style={t.panel}>
      {title ? <Text style={t.sectionLabel}>{title}</Text> : null}
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, width: '100%' }}>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.label}>
              <td
                style={{
                  padding: i === 0 ? '0 0 8px' : '8px 0',
                  fontSize: '14px',
                  color: color.textMuted,
                  verticalAlign: 'top' as const,
                  borderTop: i === 0 ? 'none' : `1px solid ${color.border}`,
                  width: '45%',
                  fontFamily: t.text.fontFamily,
                }}
              >
                {r.label}
              </td>
              <td
                style={{
                  padding: i === 0 ? '0 0 8px' : '8px 0',
                  fontSize: r.emphasis ? '16px' : '14px',
                  fontWeight: r.emphasis ? 700 : 500,
                  color: r.emphasis ? color.text : color.textSecondary,
                  textAlign: 'right' as const,
                  verticalAlign: 'top' as const,
                  borderTop: i === 0 ? 'none' : `1px solid ${color.border}`,
                  fontFamily: r.mono ? 'Menlo, Consolas, monospace' : undefined,
                }}
              >
                {r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

/** Big single-figure block for receipts. */
export const AmountBlock = ({ label, amount }: { label: string; amount: string }) => (
  <Section
    style={{
      backgroundColor: color.surfaceMuted,
      border: `1px solid ${color.border}`,
      borderRadius: '12px',
      padding: '20px',
      margin: '0 0 20px',
      textAlign: 'center' as const,
    }}
  >
    <Text style={{ ...t.sectionLabel, margin: '0 0 6px' }}>{label}</Text>
    <Text style={{ fontSize: '32px', fontWeight: 700, color: color.text, margin: 0, letterSpacing: '-0.02em' }}>
      {amount}
    </Text>
  </Section>
)

// ---- Support row -----------------------------------------------------
export const SupportRow = ({ note }: { note?: string }) => (
  <Text style={{ ...t.small, margin: '16px 0 0' }}>
    {note ? `${note} ` : 'Need help? '}
    Email <Link href={`mailto:${SUPPORT_EMAIL}`} style={t.link}>{SUPPORT_EMAIL}</Link> or call{' '}
    <Link href={SUPPORT_PHONE_HREF} style={t.link}>{SUPPORT_PHONE}</Link> ({SUPPORT_HOURS}).
  </Text>
)

// ---- Footers ---------------------------------------------------------
const footerLinkStyle = { color: color.textMuted, textDecoration: 'underline', fontSize: '12px' } as const

/**
 * Transactional footer — deliberately simple. NO marketing unsubscribe
 * language: these messages are account-critical.
 */
export const TransactionalFooter = () => (
  <Section style={{ padding: '22px 4px 8px', textAlign: 'center' as const }}>
    <Text style={{ ...t.legal, color: color.textSecondary, fontWeight: 700, margin: '0 0 6px' }}>
      {BRAND_NAME}
    </Text>
    <Text style={t.legal}>
      <Link href={HELP_URL} style={footerLinkStyle}>Help center</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLinkStyle}>{SUPPORT_EMAIL}</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={SUPPORT_PHONE_HREF} style={footerLinkStyle}>{SUPPORT_PHONE}</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={TERMS_URL} style={footerLinkStyle}>Terms</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={PRIVACY_URL} style={footerLinkStyle}>Privacy</Link>
    </Text>
    <Text style={{ ...t.legal, margin: '6px 0 0' }}>
      © {currentYear()} {BRAND_NAME}. You received this message because of activity on your{' '}
      {BRAND_NAME} account.
    </Text>
  </Section>
)

/**
 * Marketing footer variant — adds the CAN-SPAM required unsubscribe link
 * and physical mailing address. Never use on transactional mail.
 */
export const MarketingFooter = ({ unsubscribeUrl }: { unsubscribeUrl?: string }) => (
  <Section style={{ padding: '22px 4px 8px', textAlign: 'center' as const }}>
    <Text style={{ ...t.legal, color: color.textSecondary, fontWeight: 700, margin: '0 0 6px' }}>
      {BRAND_NAME}
    </Text>
    <Text style={t.legal}>
      <Link href={SUPPORT_PHONE_HREF} style={footerLinkStyle}>{SUPPORT_PHONE}</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={HELP_URL} style={footerLinkStyle}>Help center</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={TERMS_URL} style={footerLinkStyle}>Terms</Link>
      <span style={{ color: color.borderStrong }}>{'  ·  '}</span>
      <Link href={PRIVACY_URL} style={footerLinkStyle}>Privacy</Link>
    </Text>
    <Text style={{ ...t.legal, margin: '6px 0 0' }}>{MAILING_ADDRESS}</Text>
    {unsubscribeUrl ? (
      <Text style={{ ...t.legal, margin: '6px 0 0' }}>
        <Link href={unsubscribeUrl} style={footerLinkStyle}>Unsubscribe from marketing email</Link>
      </Text>
    ) : null}
    <Text style={{ ...t.legal, margin: '6px 0 0' }}>© {currentYear()} {BRAND_NAME}.</Text>
  </Section>
)

// ---- Outer shell -----------------------------------------------------
/**
 * Dark-mode resilience: Vendibook email is a light-only design. BrandHead
 * declares `color-scheme: light` (honoured by Apple Mail / iOS 13+,
 * Outlook.com and increasingly Gmail) and re-asserts background + text
 * colours for clients that partially invert (Gmail Android / Samsung Mail use
 * [data-ogsc]) — see EMAIL_HEAD_CSS in ./bulletproof.ts.
 */
export const VendibookEmailLayout = ({
  preview,
  children,
  footer = 'transactional',
  unsubscribeUrl,
  headerAlign = 'left',
  logoWidth = 148,
}: {
  /** Hidden inbox preheader text. */
  preview: string
  children: React.ReactNode
  footer?: 'transactional' | 'marketing' | 'none'
  unsubscribeUrl?: string
  headerAlign?: 'left' | 'center'
  logoWidth?: number
}) => (
  <Html lang="en" dir="ltr">
    <BrandHead />
    <Preview>{preview}</Preview>
    <Body style={t.body} className="vb-body">
      <Container style={t.container}>
        <EmailHeader align={headerAlign} width={logoWidth} />
        <Section style={t.surface} className="vb-surface">{children}</Section>

        {footer === 'marketing' ? (
          <MarketingFooter unsubscribeUrl={unsubscribeUrl} />
        ) : footer === 'transactional' ? (
          <TransactionalFooter />
        ) : null}
      </Container>
    </Body>
  </Html>
)

export * from './tokens.ts'
export { brandHeadHtml, ctaButtonHtml, injectBrandHead } from './bulletproof.ts'
