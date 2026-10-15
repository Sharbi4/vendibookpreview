import json, re, sys
txt = open(sys.argv[1]).read().split('\n')
start = next(i for i, l in enumerate(txt) if l.strip() == '17. Ready-to-use customer FAQ bank')
end = next(i for i, l in enumerate(txt) if l.strip().startswith('Appendix A.') and i > start)
lines = [l.strip() for l in txt[start + 1:end]]
lines = [l for l in lines if l and not l.startswith('VENDIBOOK / AI SUPPORT') and not l.startswith('Internal operations |')]
cats = ['Getting started & listings', 'Fees & payments', 'Vendibook Pro & BuyerMatch AI', 'Purchasing, invoices & offers',
        'Walkthrough, shipping, pickup & signoff', 'Refunds, cancellations & disputes', 'Other services & support']
# drop the intro paragraph before the first category
lines = lines[lines.index(cats[0]):]
out, cat, q, a = [], None, None, []
def flush():
    if q:
        out.append({'category': cat, 'question': q, 'answer': ' '.join(a).replace('  ', ' ').strip()})
for l in lines:
    if l in cats:
        flush(); q, a = None, []; cat = l; continue
    if l.endswith('?') and (not a or a[-1].endswith('.') or a[-1].endswith('”')):
        flush(); q, a = l, []; continue
    a.append(l)
flush()
# Owner overrides that take precedence over the guide (record the date).
OVERRIDES = {
    # 2026-10-15: pay in person / cash sales are retired.
    'Are in-person equipment sales free?': ('Can I pay in person or with cash?',
        "No. Vendibook no longer supports pay-in-person or cash sales. Purchases go through Vendibook's checkout or invoice so the transaction is documented; off-platform payments don't receive Vendibook checkout protections."),
}
for e in out:
    if e['question'] in OVERRIDES:
        e['question'], e['answer'] = OVERRIDES[e['question']]
assert all(e['answer'] for e in out), [e for e in out if not e['answer']]
body = ',\n'.join('  ' + json.dumps(e, ensure_ascii=False) for e in out)
ts = f'''/**
 * Vendibook AI Support Agent Master Guide v5.0 (owner, 2026-10-14), Section 17
 * "Ready-to-use customer FAQ bank". Generated from
 * docs/support/vendibook-ai-support-master-guide-v5.txt — regenerate rather
 * than editing by hand (python3 scripts/gen-atlas-guide-faq.py <guide.txt> <out.ts>).
 * Owner overrides in the script win over the guide (2026-10-15: pay in person
 * is retired). Atlas answers policy questions from this (get_faq).
 */
export interface GuideFaq {{
  category: string;
  question: string;
  answer: string;
}}

export const GUIDE_VERSION = 'Vendibook AI Support Agent Master Guide v5.0 (2026-10-14)';

export const GUIDE_FAQ: GuideFaq[] = [
{body},
];
'''
open(sys.argv[2], 'w').write(ts)
print(len(out), 'entries;', {c: sum(1 for e in out if e['category'] == c) for c in cats})
