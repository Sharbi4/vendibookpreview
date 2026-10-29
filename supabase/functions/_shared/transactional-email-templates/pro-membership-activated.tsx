import * as React from 'npm:react@18.3.1'
import { Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { CtaButton, DetailTable, Divider, SupportRow, VendibookEmailLayout, SITE_URL, t } from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  /** Actual subscription price and cadence; omit unknown billing details. */
  amount?: string
  interval?: string
  nextBillingDate?: string
  manageUrl?: string
}

const features = [
  { title: 'Meet your next buyer. Or renter.', detail: 'BuyerMatch AI helps our team research demand for your eligible sale or rental listing. Submit a matching search, then follow reviewed activity and reports in your dashboard. Research starts after activation; matches and responses depend on real interest.', path: '/dashboard/buyermatch', action: 'Explore BuyerMatch AI' },
  { title: 'Price with more perspective.', detail: 'PricePilot brings comparable-backed appraisals and equipment insights together, so you can assess your asking price with more context. Valuations are estimates, not guaranteed sale prices.', path: '/tools/pricepilot', action: 'Explore PricePilot' },
  { title: 'Turn permits into a plan.', detail: 'PermitPath Plus helps you save local permit roadmaps, track progress, organize documents and export a PDF. Keep the next requirement in view, and confirm requirements with the issuing authority.', path: '/tools/permitpath', action: 'Explore PermitPath Plus' },
  { title: 'Give your listing the spotlight.', detail: 'Your membership includes one Featured Boost credit each paid billing period. Choose an eligible active listing and apply your credit from your listings dashboard. Credits expire at the end of the period and do not roll over.', path: '/dashboard/listings', action: 'Use your Featured Boost' },
]

const Email = ({ firstName, planName = 'Vendibook Pro', amount, interval, nextBillingDate,
  manageUrl = `${SITE_URL}/dashboard/buyermatch/membership`,
}: Props) => (
  <VendibookEmailLayout preview="Your Pro membership is active. Explore matching, pricing, permits and more." headerAlign="center" logoWidth={176}>
    <Section style={{ backgroundColor: '#202020', borderRadius: '16px', padding: '32px 24px', borderTop: '4px solid #FF612B' }}>
      <Text style={{ ...t.eyebrow, color: '#FFB08E', margin: '0 0 18px' }}>YOUR NEXT CHAPTER / PRO</Text>
      <Heading as="h1" style={{ ...t.h1, color: '#FFFFFF', fontSize: '36px', lineHeight: 1.14, letterSpacing: '-1px', margin: '0 0 18px' }}>Welcome to<br />a little more possibility.</Heading>
      <Text style={{ ...t.text, color: '#E2E2E2', margin: 0 }}>{firstName ? `${firstName}, your` : 'Your'} {planName} membership is active. Put your listing in motion with matching support, pricing insights and a clearer path to your permits.</Text>
    </Section>
    <Section style={{ padding: '24px 0 8px' }}>
      <CtaButton href={`${SITE_URL}/dashboard`}>Explore your Pro dashboard</CtaButton>
      <Text style={{ ...t.small, textAlign: 'center', color: '#676767' }}>One membership. Your next steps, all in one place.</Text>
    </Section>
    {features.map((feature, index) => <Section key={feature.path} style={{ padding: '24px 0', borderBottom: '1px solid #E7E7E7' }}>
      <Text style={{ ...t.eyebrow, color: '#B53E14', margin: '0 0 8px' }}>0{index + 1} / INCLUDED WITH PRO</Text>
      <Heading as="h2" style={{ ...t.h1, fontSize: '23px', letterSpacing: '-0.5px', margin: '0 0 10px', color: '#202020' }}>{feature.title}</Heading>
      <Text style={{ ...t.text, color: '#595959', margin: '0 0 12px' }}>{feature.detail}</Text>
      <Link href={`${SITE_URL}${feature.path}`} style={{ ...t.link, color: '#B53E14', fontWeight: 700 }}>{feature.action} &rarr;</Link>
    </Section>)}
    <Text style={{ ...t.small, margin: '14px 0', color: '#676767' }}>Your included Boost credit is separate from a paid Featured Listing subscription.</Text>
    <Section style={{ backgroundColor: '#F4F4F4', padding: '22px', borderRadius: '12px', margin: '16px 0 24px' }}>
      <Heading as="h2" style={{ ...t.h1, fontSize: '20px', margin: '0 0 8px' }}>Also included</Heading>
      <Text style={{ ...t.text, margin: 0, color: '#595959' }}>Priority placement in search, priority support and deeper listing analytics to help you decide what to do next.</Text>
      <Text style={{ margin: '14px 0 0' }}><Link href={`${SITE_URL}/dashboard/analytics`} style={t.link}>Open your analytics &rarr;</Link></Text>
    </Section>
    <DetailTable rows={[
      { label: 'Membership', value: planName },
      { label: 'Subscription', value: amount && interval ? `${amount} / ${interval}` : undefined },
      { label: 'Next billing date', value: nextBillingDate },
    ]} />
    <Text style={t.small}>Cancel anytime. Cancelling stops future renewals; access continues through your paid period. <Link href={manageUrl} style={t.link}>Manage membership</Link>.</Text>
    <Divider />
    <Text style={t.text}>Need a hand getting started? We&apos;re here to help you make the most of Pro.</Text>
    <SupportRow />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: () => 'Welcome to Vendibook Pro — your next chapter starts here',
  displayName: 'Vendibook Pro — premium welcome',
  previewData: { firstName: 'Alex', planName: 'Vendibook Pro', amount: '$79.00', interval: 'month' },
} satisfies TemplateEntry
