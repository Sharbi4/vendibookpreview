/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import {
  assert,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

import { SignupEmail } from './signup.tsx'
import { InviteEmail } from './invite.tsx'
import { MagicLinkEmail } from './magic-link.tsx'
import { RecoveryEmail } from './recovery.tsx'
import { EmailChangeEmail } from './email-change.tsx'
import { ReauthenticationEmail } from './reauthentication.tsx'

const SITE_NAME = 'Vendibook'
const SITE_URL = 'https://vendibook.com'
const RECIPIENT = 'user@example.test'
const CONFIRMATION_URL = 'https://vendibook.com/confirm?token=sample'

// deno-lint-ignore no-explicit-any
const AUTH_TEMPLATES: Array<{ name: string; component: any; props: Record<string, any> }> = [
  { name: 'signup', component: SignupEmail, props: { siteName: SITE_NAME, siteUrl: SITE_URL, recipient: RECIPIENT, confirmationUrl: CONFIRMATION_URL } },
  { name: 'invite', component: InviteEmail, props: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: CONFIRMATION_URL } },
  { name: 'magiclink', component: MagicLinkEmail, props: { siteName: SITE_NAME, confirmationUrl: CONFIRMATION_URL } },
  { name: 'recovery', component: RecoveryEmail, props: { siteName: SITE_NAME, confirmationUrl: CONFIRMATION_URL } },
  { name: 'email_change', component: EmailChangeEmail, props: { siteName: SITE_NAME, email: RECIPIENT, newEmail: 'new@example.test', confirmationUrl: CONFIRMATION_URL } },
  { name: 'reauthentication', component: ReauthenticationEmail, props: { token: '123456' } },
]

const FORBIDDEN_BRAND = ['VendiBook', 'vendibookpreview', 'Vendi Book']
const FORBIDDEN_URLS = ['vendibookpreview.lovable.app', 'lovable.app']
const FORBIDDEN_GENERIC_ORANGE = '#f97316'

for (const t of AUTH_TEMPLATES) {
  Deno.test(`auth render: ${t.name} renders cleanly`, async () => {
    const html = await renderAsync(React.createElement(t.component, t.props))
    assert(html.length > 200, `${t.name}: HTML too small`)
    assertStringIncludes(html, '<html', `${t.name}: missing <html>`)
    assertStringIncludes(html, 'VENDIBOOK', `${t.name}: missing wordmark`)
  })

  Deno.test(`auth brand: ${t.name} brand-clean`, async () => {
    const html = await renderAsync(React.createElement(t.component, t.props))
    const lower = html.toLowerCase()
    assert(!lower.includes(FORBIDDEN_GENERIC_ORANGE), `${t.name}: uses tailwind orange instead of brand #FF5124`)
    for (const bad of FORBIDDEN_URLS) {
      assert(!lower.includes(bad.toLowerCase()), `${t.name}: contains forbidden URL "${bad}"`)
    }
    for (const bad of FORBIDDEN_BRAND) {
      assert(!html.includes(bad), `${t.name}: forbidden brand spelling "${bad}"`)
    }
  })

  Deno.test(`auth body: ${t.name} body background white`, async () => {
    const html = await renderAsync(React.createElement(t.component, t.props))
    const bodyMatch = html.match(/<body[^>]*style="([^"]*)"/i)
    assert(bodyMatch, `${t.name}: body missing inline style`)
    const style = bodyMatch[1].toLowerCase()
    assert(
      style.includes('#ffffff') || style.includes('rgb(255,255,255)') || style.includes('rgb(255, 255, 255)'),
      `${t.name}: body background not white`,
    )
  })
}
