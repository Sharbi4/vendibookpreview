/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { TEMPLATES } from './registry.ts'

const BRAND_ORANGE = '#FF5124'
const BRAND_WORDMARK = 'VENDIBOOK'
const FORBIDDEN_BRAND_VARIANTS = ['VendiBook', 'vendibook ', 'Vendi Book', 'vendibookpreview']
const FORBIDDEN_URLS = ['vendibookpreview.lovable.app', 'lovable.app']
const FORBIDDEN_GENERIC_ORANGE = '#f97316' // tailwind orange — must use brand orange instead

// 1. Registry integrity — every template has the required shape.
Deno.test('registry: every template has component + subject', () => {
  const names = Object.keys(TEMPLATES)
  assert(names.length > 0, 'registry must have at least one template')
  for (const name of names) {
    const entry = TEMPLATES[name]
    assert(entry.component, `${name}: missing component`)
    assert(
      typeof entry.subject === 'string' || typeof entry.subject === 'function',
      `${name}: subject must be string or function`,
    )
  }
})

// 2. Every template must declare previewData so the dashboard preview works.
Deno.test('registry: every template declares previewData', () => {
  for (const [name, entry] of Object.entries(TEMPLATES)) {
    assert(
      entry.previewData && typeof entry.previewData === 'object',
      `${name}: missing previewData (required for dashboard preview)`,
    )
  }
})

// 3. Every template renders to non-empty HTML using its previewData.
for (const [name, entry] of Object.entries(TEMPLATES)) {
  Deno.test(`render: ${name} renders with previewData`, async () => {
    const html = await renderAsync(
      React.createElement(entry.component, entry.previewData ?? {}),
    )
    assert(html.length > 200, `${name}: rendered HTML suspiciously small (${html.length} chars)`)
    assertStringIncludes(html, '<html', `${name}: missing <html>`)
    assertStringIncludes(html, '</html>', `${name}: missing </html>`)
  })
}

// 4. Subject resolves cleanly (no "undefined", no empty string).
for (const [name, entry] of Object.entries(TEMPLATES)) {
  Deno.test(`subject: ${name} resolves to non-empty string`, () => {
    const subject = typeof entry.subject === 'function'
      ? entry.subject(entry.previewData ?? {})
      : entry.subject
    assert(typeof subject === 'string', `${name}: subject not a string`)
    assert(subject.length > 0, `${name}: empty subject`)
    assert(
      !subject.toLowerCase().includes('undefined'),
      `${name}: subject contains "undefined" — check previewData fields: "${subject}"`,
    )
    assert(
      !subject.toLowerCase().includes('null'),
      `${name}: subject contains "null": "${subject}"`,
    )
  })
}

// 5. Brand consistency — wordmark, color, no preview URLs, no forbidden variants.
for (const [name, entry] of Object.entries(TEMPLATES)) {
  Deno.test(`brand: ${name} uses correct branding`, async () => {
    const html = await renderAsync(
      React.createElement(entry.component, entry.previewData ?? {}),
    )

    // Wordmark present
    assertStringIncludes(html, BRAND_WORDMARK, `${name}: missing VENDIBOOK wordmark`)

    // Brand orange used (most templates have a CTA or accent)
    // Skip enforcement on plain digests if they have no CTA, but warn via presence of any orange.
    const hasGenericOrange = html.toLowerCase().includes(FORBIDDEN_GENERIC_ORANGE.toLowerCase())
    assert(
      !hasGenericOrange,
      `${name}: uses tailwind orange ${FORBIDDEN_GENERIC_ORANGE} — must use brand ${BRAND_ORANGE}`,
    )

    // No preview/lovable URLs leaking through
    for (const bad of FORBIDDEN_URLS) {
      assert(
        !html.toLowerCase().includes(bad.toLowerCase()),
        `${name}: contains forbidden URL "${bad}" — should use vendibook.com`,
      )
    }

    // No legacy brand spellings
    for (const bad of FORBIDDEN_BRAND_VARIANTS) {
      assert(
        !html.includes(bad),
        `${name}: contains forbidden brand spelling "${bad}"`,
      )
    }
  })
}

// 6. Body background must be white (deliverability / dark-mode rule).
for (const [name, entry] of Object.entries(TEMPLATES)) {
  Deno.test(`style: ${name} has white body background`, async () => {
    const html = await renderAsync(
      React.createElement(entry.component, entry.previewData ?? {}),
    )
    // Look for white background on body — accept #ffffff, #fff, or rgb(255,255,255).
    const bodyMatch = html.match(/<body[^>]*style="([^"]*)"/i)
    assert(bodyMatch, `${name}: <body> has no inline style`)
    const bodyStyle = bodyMatch[1].toLowerCase()
    const isWhite = bodyStyle.includes('#ffffff') ||
      bodyStyle.includes('#fff;') ||
      bodyStyle.includes('#fff"') ||
      bodyStyle.includes('rgb(255,255,255)') ||
      bodyStyle.includes('rgb(255, 255, 255)')
    assert(isWhite, `${name}: body background not white — got "${bodyStyle}"`)
  })
}

// 7. No marketing/unsubscribe links inside template HTML (system appends footer).
for (const [name, entry] of Object.entries(TEMPLATES)) {
  Deno.test(`policy: ${name} does not include unsubscribe link`, async () => {
    const html = await renderAsync(
      React.createElement(entry.component, entry.previewData ?? {}),
    )
    const lower = html.toLowerCase()
    // The system appends an unsubscribe footer — templates must NOT include their own.
    assert(
      !lower.includes('unsubscribe'),
      `${name}: contains "unsubscribe" — system appends this automatically, remove from template`,
    )
  })
}
