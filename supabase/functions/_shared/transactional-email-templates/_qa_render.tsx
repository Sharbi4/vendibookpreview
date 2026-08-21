import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from './registry.ts'

let ok = 0, fail = 0
for (const [name, entry] of Object.entries(TEMPLATES) as any) {
  try {
    const html = await renderAsync(React.createElement(entry.component, entry.previewData ?? {}))
    if (/#0a0a0a|#141414|background-color:\s*#000/i.test(html)) console.log('DARK?', name)
    ok++
  } catch (e) { fail++; console.log('FAIL', name, String(e).slice(0,200)) }
}
const auth = ['signup','recovery','magic-link','invite','email-change','reauthentication']
for (const a of auth) {
  try {
    const m = await import(`../email-templates/${a}.tsx`)
    await renderAsync(React.createElement(m.default, { siteName:'Vendibook', siteUrl:'https://vendibook.com', recipient:'x@y.com', email:'x@y.com', oldEmail:'a@b.com', newEmail:'x@y.com', confirmationUrl:'https://vendibook.com/c', token:'123456' }))
    ok++
  } catch(e){ fail++; console.log('AUTHFAIL', a, String(e).slice(0,200)) }
}
console.log('ok', ok, 'fail', fail)
