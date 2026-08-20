/// <reference types="npm:@types/react@18.3.1" />
// Shared Vendibook brand chrome for auth emails — same wordmark and
// footer link set used by the app (transactional) emails.

import * as React from 'npm:react@18.3.1'
import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'

export const SITE_URL = 'https://vendibook.com'
export const SUPPORT_PHONE = '(725) 755-9598'
export const LOGO_URL =
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-hero-logo.png?v=2026-08'

export const AuthBrandHeader = () => (
  <Section style={{ padding: '0 0 18px', textAlign: 'center' as const }}>
    <a href={SITE_URL} style={{ textDecoration: 'none', display: 'inline-block' }}>
      <Img
        src={LOGO_URL}
        alt="Vendibook"
        width="360"
        height="240"
        style={{ display: 'block', margin: '0 auto', border: 0, outline: 'none', width: '100%', maxWidth: '360px', height: 'auto' }}
      />
    </a>
  </Section>
)

const BLOG_PICKS = [
  { slug: 'how-to-start-food-truck-business-2025', title: 'How to start a food truck business in 2026' },
  { slug: 'food-truck-vs-food-trailer-which-is-right', title: 'Food truck vs. food trailer — which is right for you?' },
]

const FOOTER_LINKS = [
  { label: 'Browse marketplace', href: `${SITE_URL}/browse` },
  { label: 'List your truck', href: `${SITE_URL}/list` },
  { label: 'Pricing & plans', href: `${SITE_URL}/pricing` },
  { label: 'Blog', href: `${SITE_URL}/blog` },
  { label: 'Help center', href: `${SITE_URL}/help` },
]

export const AuthBrandFooter = () => (
  <Section style={{ padding: '26px 4px 0', textAlign: 'center' as const }}>
    <a href={SITE_URL} style={{ textDecoration: 'none', display: 'inline-block' }}>
      <Img
        src={LOGO_URL}
        alt="Vendibook"
        width="360"
        height="240"
        style={{ display: 'block', margin: '0 auto 14px', border: 0, outline: 'none', width: '100%', maxWidth: '360px', height: 'auto' }}
      />
    </a>
    <Text style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#737373', fontWeight: 700, margin: '0 0 10px' }}>
      FROM THE VENDIBOOK BLOG
    </Text>
    {BLOG_PICKS.map((p) => (
      <Text key={p.slug} style={{ fontSize: '14px', lineHeight: 1.45, margin: '0 0 8px' }}>
        <a href={`${SITE_URL}/blog/${p.slug}`} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>
          {p.title}
        </a>
      </Text>
    ))}
    <Text style={{ fontSize: '12px', lineHeight: 1.9, color: '#737373', margin: '14px 0 0' }}>
      {FOOTER_LINKS.map((l, i) => (
        <React.Fragment key={l.href}>
          {i > 0 ? <span style={{ color: '#d4d4d4' }}>{'  ·  '}</span> : null}
          <a href={l.href} style={{ color: '#737373', textDecoration: 'none' }}>{l.label}</a>
        </React.Fragment>
      ))}
    </Text>
    <Text style={{ fontSize: '11px', color: '#a3a3a3', margin: '12px 0 0' }}>
      Vendibook · Questions? {SUPPORT_PHONE} or support@vendibook.com
    </Text>
  </Section>
)
