import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  listingTitle?: string
  listingId?: string
  coverImageUrl?: string
}

const E = ({ firstName, listingTitle, listingId, coverImageUrl }: Props) => {
  const resumeUrl = listingId ? `${SITE_URL}/create-listing/${listingId}` : `${SITE_URL}/list`
  const hi = firstName ? `Hi ${firstName},` : 'Hi there,'
  const listingRef = listingTitle ? `“${listingTitle}”` : 'your listing'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Vendibook listing is ready to go</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
          <Section style={s.card}>
            <Text style={s.smallHeader}>CUSTOMER SUCCESS</Text>
            <Heading style={s.h1}>Your listing is ready to go</Heading>
            <Text style={s.lede}>{hi}</Text>
            <Text style={s.body}>
              We recently resolved a technical issue that may have affected listing creation on Vendibook.
              If you had trouble publishing {listingRef}, everything should now be working normally.
            </Text>
            <Text style={s.body}>
              You can pick up right where you left off — your draft is saved.
            </Text>
            <Section style={s.ctaWrap}>
              <Button href={resumeUrl} style={s.button}>Finish & publish</Button>
            </Section>
            <Text style={s.small}>
              If you run into anything, just reply to this email — our Customer Success team is happy to help.
            </Text>
            <Text style={s.small}>— Vendibook Customer Success</Text>
          </Section>
        <BrandFooter /></Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: E,
  subject: () => 'Your Vendibook listing is ready to go',
  displayName: 'Listing recovery (Customer Success)',
  previewData: {
    firstName: 'Sam',
    listingTitle: 'Downtown Food Trailer',
    listingId: 'demo',
    coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  },
} satisfies TemplateEntry
