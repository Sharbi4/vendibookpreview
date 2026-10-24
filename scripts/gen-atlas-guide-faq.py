import json, re, sys
txt = open(sys.argv[1]).read().split('\n')
start = next(i for i, l in enumerate(txt) if l.strip() == '17. Ready-to-use customer FAQ bank')
end = next(i for i, l in enumerate(txt) if l.strip().startswith('Appendix A.') and i > start)
lines = [l.strip() for l in txt[start + 1:end]]
lines = [l for l in lines if l and not l.startswith('VENDIBOOK / AI SUPPORT') and not l.startswith('Internal operations |')]
cats = ['Getting started & listings', 'Fees & payments', 'Vendibook Pro & BuyerMatch AI', 'Purchasing, invoices & offers',
        'Walkthrough, shipping, pickup & signoff', 'Refunds, cancellations & disputes', 'Account management, closure & data privacy', 'Other services & support']
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
    # Owner 2026-10-24: Pro no longer discounts any commission.
    'Does Pro reduce my equipment-sale commission?': ('Does Pro reduce my equipment-sale commission?', 'No. New online equipment sales have an 8.7% seller commission on Free and Pro. Rental hosts pay 12.9% and renters pay a separate 12.9% on both plans. Pro does not discount commissions.'),
    'What does Pro include?': ('What does Pro include?', 'Pro includes eligible BuyerMatch AI discovery with reviewed outreach subject to activation and capacity, one Featured Boost credit per billing period, PricePilot, PermitPath Plus, priority placement and support. Pro does not discount commissions or guarantee buyers or sales.'),
    # v5.3 retires pay in person itself ("Can I pay the seller directly or in person?").
    # 2026-10-15: mission line.
    'What is Vendibook?': ('What is Vendibook?',
        'Vendibook is a marketplace for finding, buying, selling and renting mobile-food equipment and spaces, including food trucks, food trailers, carts, commercial kitchens and vendor lots. We are here to support the food truck community: helping operators buy, sell and rent the right equipment and grow their businesses.'),
    # 2026-10-15: payouts go out 24 hours after completion is confirmed; rentals are Square.
    'Does Vendibook hold payments in escrow?': ('Does Vendibook hold payments in escrow?',
        'No. Vendibook is not an escrow service. Sellers and hosts are paid out within 24 hours after the sale or rental is complete and confirmed, with signatures and the other handoff steps done. Equipment sales are paid through the PayPal-powered checkout or invoice; rentals are paid by card through Square.'),
    'Can I pay with a card?': ('Can I pay with a card?',
        'Eligible equipment sales use the approved PayPal-powered checkout or invoice flow; rentals are paid by card through Square. Available payment options are shown on the actual payment screen.'),
}
# Owner additions with no guide entry (category, question, answer).
ADDITIONS = [
    ('Fees & payments', 'When do I get paid?',
     'We pay out within 24 hours after the sale or rental is complete and confirmed: the agreement is signed and the other handoff steps are done. Rentals are paid by card through Square; equipment sales through the PayPal-powered checkout or invoice.'),
]
for e in out:
    if e['question'] in OVERRIDES:
        e['question'], e['answer'] = OVERRIDES[e['question']]
for cat_name, q_text, a_text in ADDITIONS:
    at = max(i for i, e in enumerate(out) if e['category'] == cat_name) + 1
    out.insert(at, {'category': cat_name, 'question': q_text, 'answer': a_text})
assert all(e['answer'] for e in out), [e for e in out if not e['answer']]
body = ',\n'.join('  ' + json.dumps(e, ensure_ascii=False) for e in out)
ts = f'''/**
 * Vendibook AI Support Agent Master Guide v5.3 (owner, 2026-10-14), Section 17
 * "Ready-to-use customer FAQ bank". Generated from
 * docs/support/vendibook-ai-support-master-guide-v5.3.txt — regenerate rather
 * than editing by hand (python3 scripts/gen-atlas-guide-faq.py <guide.txt> <out.ts>).
 * Owner overrides in the script win over the guide (2026-10-15: payouts within 24 hours after completion is confirmed; rentals via
 * Square; mission line). Atlas answers policy questions from this (get_faq).
 */
export interface GuideFaq {{
  category: string;
  question: string;
  answer: string;
}}

export const GUIDE_VERSION = 'Vendibook AI Support Agent Master Guide v5.3 (2026-10-14)';

export const GUIDE_FAQ: GuideFaq[] = [
{body},
];
'''
open(sys.argv[2], 'w').write(ts)
print(len(out), 'entries;', {c: sum(1 for e in out if e['category'] == c) for c in cats})
