import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

/**
 * Customer Success follow-up for a seller whose guided ("List with Vendi")
 * session produced duplicate drafts. Everything they entered was consolidated
 * into ONE saved draft, which remains unpublished. Purely informational —
 * the seller decides when to publish.
 */
interface Props {
  firstName?: string
  listingTitle?: string
  listingId?: string
  coverImageUrl?: string
  /** Human summary of the asset, e.g. "2018 Ford Transit 3500 custom soft-serve truck". */
  assetSummary?: string
  /** Formatted asking price, e.g. "$125,000". */
  askingPrice?: string
}

const E = ({ firstName, listingTitle, listingId, coverImageUrl, assetSummary, askingPrice }: Props) => {
  const resumeUrl = listingId ? `${SITE_URL}/create-listing/${listingId}` : `${SITE_URL}/list`
  const hi = firstName ? `Hi ${firstName},` : 'Hi there,'
  const priceClause = askingPrice ? `, ${askingPrice} asking price` : ''
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>We saved your Vendibook listing</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
          <Section style={s.card}>
            <Text style={s.smallHeader}>CUSTOMER SUCCESS</Text>
            <Heading style={s.h1}>We saved your Vendibook listing</Heading>
            <Text style={s.lede}>{hi}</Text>
            <Text style={s.body}>
              We wanted to follow up about the food truck listing you started on Vendibook.
            </Text>
            <Text style={s.body}>
              While you were working with Vendi, our guided listing assistant, a system issue caused a
              few duplicate drafts of the same listing to be created. We identified the issue and have
              now corrected it.
            </Text>
            <Text style={s.body}>
              We also consolidated everything you entered into one saved draft, including your photos,
              description{priceClause}, location, equipment details, and vehicle information. Your
              listing is still unpublished, so nothing went live without your approval.
            </Text>
            <Text style={s.body}>
              {assetSummary ? `Your ${assetSummary} listing` : 'Your listing'} is saved and ready for
              you to continue whenever you&rsquo;re ready.
            </Text>
            <Section style={s.ctaWrap}>
              <Button href={resumeUrl} style={s.button}>Continue my listing</Button>
            </Section>
            <Text style={s.body}>
              Thank you for trying Vendi. Your experience helped us identify something we needed to
              improve, and we&rsquo;ve updated the system so returning sellers can continue the same
              listing without accidentally creating duplicates.
            </Text>
            <Text style={s.small}>
              If you&rsquo;d like any help finishing the listing or getting it live, just reply to this
              email and our Customer Success team will be happy to help.
            </Text>
            <Text style={s.small}>— Vendibook Customer Success</Text>
          </Section>
          <BrandFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: E,
  subject: () => 'We saved your Vendibook listing',
  displayName: 'Listing draft consolidated (Customer Success)',
  previewData: {
    firstName: 'Sam',
    listingTitle: 'Turn key custom soft serve business',
    listingId: 'demo',
    assetSummary: '2018 Ford Transit 3500 custom soft-serve truck',
    askingPrice: '$125,000',
  },
} satisfies TemplateEntry
