// ─────────────────────────────────────────────────────────────
// VENDIBOOK EMAIL CHROME — string builders shared by every email
//
// Used by the React Email layer (`./components.tsx`), the string-HTML
// marketing templates (`../marketing-templates/brand.ts`) and the edge
// functions that hand-build HTML for Resend. Pure strings: no React, no
// Deno APIs, so the same code runs in Deno and in Vitest.
//
//   • brandHeadHtml()   — Poppins <link>/@import, sans-serif reset on every
//                         text element, and the Outlook (mso) Arial override
//                         so Word-engine Outlook never falls back to Times.
//   • injectBrandHead() — adds that block to an existing HTML document.
//   • ctaButtonHtml()   — bulletproof orange glow pill (table + Outlook VML).
// ─────────────────────────────────────────────────────────────
import {
  CTA_BG,
  CTA_GRADIENT,
  CTA_SHADOW,
  FONT_STACK,
  GOOGLE_FONTS_HREF,
  color,
} from './tokens.ts'

/** What Word-engine Outlook renders instead of Poppins (never Times). */
export const MSO_FONT_STACK = 'Arial, Helvetica, sans-serif'

const BRAND_HEAD_MARKER = '<!-- vb-brand-head -->'

const escHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  )

/**
 * Shared <head> CSS. Inline styles still win, so a template's own colours,
 * sizes and monospace values are untouched; this only fills in the font
 * family wherever an element has none (the cause of the Times fallback).
 */
export const EMAIL_HEAD_CSS = `
@import url('${GOOGLE_FONTS_HREF}');
:root { color-scheme: light only; supported-color-schemes: light only; }
body, table, td, th, p, a, li, h1, h2, h3, h4 { font-family: ${FONT_STACK}; }
body, table, td, div, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
.vb-cta a { font-family: ${FONT_STACK}; }
u + .vb-body .vb-surface { background-color: #ffffff !important; }
[data-ogsc] .vb-body { background-color: #faf7f2 !important; }
[data-ogsc] .vb-surface { background-color: #ffffff !important; }
[data-ogsc] .vb-panel { background-color: #f7f4ef !important; }
[data-ogsc] .vb-ink { color: #1c1917 !important; }
[data-ogsc] .vb-ink-2 { color: #57534e !important; }
@media (max-width: 600px) {
  .vb-surface { padding: 24px 18px !important; }
}
`

/** Outlook desktop (Word engine): force Arial instead of Times New Roman. */
export const MSO_FONT_FIX =
  `<!--[if mso]><style type="text/css">* { font-family: ${MSO_FONT_STACK} !important; }</style><![endif]-->`

/** Google Fonts link, hidden from Outlook desktop (it cannot load it). */
export const FONT_LINK_HTML =
  `<!--[if !mso]><!--><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" type="text/css"><!--<![endif]-->`

/**
 * Everything that belongs inside <head>. `meta: false` skips the charset /
 * viewport / colour-scheme metas for documents that already declare them.
 */
export function brandHeadHtml(opts: { meta?: boolean; extraCss?: string } = {}): string {
  const meta = opts.meta === false
    ? ''
    : '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta name="x-apple-disable-message-reformatting">' +
      '<meta name="color-scheme" content="light only">' +
      '<meta name="supported-color-schemes" content="light only">'
  return (
    BRAND_HEAD_MARKER +
    meta +
    FONT_LINK_HTML +
    `<style type="text/css">${EMAIL_HEAD_CSS}${opts.extraCss ?? ''}</style>` +
    MSO_FONT_FIX
  )
}

/**
 * Adds the brand head block to a full HTML document (idempotent). A
 * document without <head> gets one; a bare fragment is wrapped in a minimal
 * document whose body carries the Poppins stack.
 */
export function injectBrandHead(html: string): string {
  if (!html || html.includes(BRAND_HEAD_MARKER)) return html
  const block = brandHeadHtml({ meta: false })
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${block}</head>`)
  const htmlOpen = html.match(/<html[^>]*>/i)
  if (htmlOpen) return html.replace(htmlOpen[0], `${htmlOpen[0]}<head>${block}</head>`)
  return `<!DOCTYPE html><html lang="en"><head>${brandHeadHtml()}</head><body style="margin:0;padding:0;font-family:${FONT_STACK};">${html}</body></html>`
}

export type CtaVariant = 'primary' | 'secondary'

/** Outlook VML needs a fixed width; size it from the label. */
function vmlWidth(label: string): number {
  return Math.max(180, Math.min(560, Math.round(label.length * 9.5 + 64)))
}

/**
 * Bulletproof CTA. Every client except Word-engine Outlook gets a table
 * cell with the brand orange fill (`bgcolor` + background-color), the site
 * gradient where supported, the orange glow (box-shadow — Apple Mail/iOS;
 * Gmail/Outlook ignore it and keep the solid fill), a 999px pill radius and
 * white Poppins 600 16px link text. Outlook desktop gets a VML roundrect in
 * the same orange with the same label. The whole pill is a real link with
 * real text — no images.
 */
export function ctaButtonHtml(opts: {
  href: string
  label: string
  variant?: CtaVariant
  align?: 'left' | 'center'
  /** Outer margin for the wrapping table (CSS shorthand). */
  margin?: string
  /** Sit beside another inline button instead of stacking. */
  inline?: boolean
}): string {
  const primary = (opts.variant ?? 'primary') === 'primary'
  const href = escHtml(opts.href)
  const label = escHtml(opts.label)
  const bg = primary ? CTA_BG : color.surface
  const fg = primary ? color.primaryText : color.text
  const border = primary ? CTA_BG : color.borderStrong
  const center = opts.align === 'center'
  const width = vmlWidth(String(opts.label ?? ''))
  const tdStyle = [
    'border-radius:999px',
    `background-color:${bg}`,
    primary ? `background-image:${CTA_GRADIENT}` : '',
    `border:1px solid ${border}`,
    primary ? `box-shadow:${CTA_SHADOW}` : '',
    'mso-padding-alt:0',
  ].filter(Boolean).join(';')
  const aStyle = [
    'display:inline-block',
    'padding:14px 28px',
    `font-family:${FONT_STACK}`,
    'font-size:16px',
    'font-weight:600',
    'line-height:20px',
    `color:${fg}`,
    'text-decoration:none',
    'border-radius:999px',
    'text-align:center',
    '-webkit-text-size-adjust:none',
  ].join(';')
  const tableStyle = [
    'border-collapse:separate',
    'mso-table-lspace:0pt',
    'mso-table-rspace:0pt',
    center && !opts.inline ? 'margin:0 auto' : '',
    opts.inline ? 'display:inline-table;vertical-align:middle' : '',
    opts.margin ? `margin:${opts.margin}` : '',
  ].filter(Boolean).join(';')
  const vml =
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" ` +
    `style="height:48px;v-text-anchor:middle;width:${width}px;" arcsize="50%" ` +
    (primary ? 'stroke="f" ' : `strokecolor="${border}" `) +
    `fillcolor="${bg}"><w:anchorlock/><center style="color:${fg};font-family:${MSO_FONT_STACK};font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->`
  const table =
    `<!--[if !mso]><!-->` +
    `<table role="presentation" class="vb-cta" border="0" cellpadding="0" cellspacing="0"${center && !opts.inline ? ' align="center"' : ''} style="${tableStyle}">` +
    `<tr><td align="center" bgcolor="${bg}" style="${tdStyle}">` +
    `<a href="${href}" target="_blank" style="${aStyle}">${label}</a>` +
    `</td></tr></table>` +
    `<!--<![endif]-->`
  return vml + table
}
