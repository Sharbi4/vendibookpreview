import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Check, ClipboardCheck, CreditCard, FileSignature, MessageSquareLock, QrCode, ShieldCheck } from 'lucide-react';
import RentalHostLanding from '@/components/rentals/RentalHostLanding';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';
import { FEE_CONFIG } from '../../supabase/functions/_shared/feeConfig';

const LIST_URL = '/list/start?mode=rent&category=ghost_kitchen';

const FAQS = [
  {
    question: 'What kinds of kitchens can I list?',
    answer:
      'Licensed commercial kitchens: restaurants with downtime, commissaries, shared and ghost kitchens, church and community kitchens, and caterers with spare prep space. Listing is free.',
  },
  {
    question: 'Can I rent by the hour or by the shift?',
    answer:
      'Yes. Set hourly, daily, weekly or monthly rates and block the hours you need for your own service. Renters only see the time you open up.',
  },
  {
    question: 'Can I require insurance, permits or certifications?',
    answer:
      'Yes. Ask renters for documents such as liability insurance, a food handler or manager certificate and their business license. You review them before you approve the booking.',
  },
  {
    question: 'How do renters pay, and how do I get paid?',
    answer:
      `Renters pay by card through Square at checkout. A booking is only marked paid after Square confirms the payment. Connect your own Square account to be paid directly, or Vendibook pays you your share. Vendibook's host fee is ${FEE_CONFIG.rentalHostFeePct}% of the booking.`,
  },
  {
    question: 'Can I restrict what equipment they use?',
    answer:
      'Yes. Describe exactly what’s included, such as prep tables only or the full hot line, and add house rules and access instructions that renters accept before they book.',
  },
  {
    question: 'Is renting my kitchen allowed in my city?',
    answer:
      'Many health departments let permitted commercial kitchens serve as commissaries or shared kitchens, but rules vary. Check with your local health department and keep your own permits current.',
  },
];

/** Printable QR that sends walk-ins straight to the kitchen's listing (Share kit). */
function QrSignage() {
  const reduced = useReducedMotion();
  return (
    <section className="px-5 pb-20 sm:pb-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 rounded-[32px] border border-border bg-card p-7 sm:p-12 md:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Share kit</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Turn foot traffic into booked shifts
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Download a QR code and share link for your listing. Post it by the back door, at your local
            food truck meetup or in your bio, and renters land on your live availability.
          </p>
          <ul className="mt-6 space-y-2.5">
            {['Print-ready QR code', 'One link to your calendar and rates', 'Share anywhere, anytime'].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <TellVendibookButton
              variant="ghost"
              size="default"
              defaultIntent="list"
              defaultCategory="commercial_kitchen"
              sourcePage="rent_my_commercial_kitchen"
            >
              Not ready to list? Tell Vendibook what you have →
            </TellVendibookButton>
          </div>
        </div>
        <motion.div
          className="mx-auto flex h-44 w-44 items-center justify-center rounded-[28px] bg-foreground text-background shadow-[0_24px_60px_-30px_rgba(28,25,23,0.6)]"
          initial={reduced ? undefined : { opacity: 0, scale: 0.94 }}
          whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          aria-hidden="true"
        >
          <QrCode className="h-24 w-24" strokeWidth={1.25} />
        </motion.div>
      </div>
    </section>
  );
}

const RentMyCommercialKitchen = () => (
  <RentalHostLanding
    seo={{
      title: 'Rent Out Your Commercial Kitchen | Vendibook',
      description:
        'Turn kitchen downtime into income. List your commercial or shared kitchen free, set hourly or daily rates, require insurance and permits, and get paid by card through Square.',
      canonical: '/rent-my-commercial-kitchen',
    }}
    source="rent_my_commercial_kitchen"
    eyebrow="For commercial & shared kitchens"
    headline={{ highlight: 'Your kitchen.', rest: 'Booked in the hours you’re closed.' }}
    subhead="Fill slow mornings, late nights and off days with food trucks, caterers and delivery brands that need licensed space. You set the hours, the rules and who gets the keys."
    primaryCta={{ label: 'List your kitchen', to: LIST_URL }}
    secondaryCta={{ label: 'Calculate earnings', to: '/kitchen-earnings-calculator' }}
    proofChips={['Free to list', 'Hourly or daily rates', 'You approve every renter']}
    audience={{
      title: 'Who books kitchen time on Vendibook',
      items: ['Food trucks needing a commissary', 'Caterers prepping big events', 'Delivery-only brands', 'Bakers & meal-prep startups', 'Cottage food makers scaling up'],
    }}
    steps={[
      { title: 'List your space free', body: 'Add photos, equipment, hours and your hourly or daily rate. Block the time you need for your own service.' },
      { title: 'Approve who cooks', body: 'See the renter’s business, intended use and documents, message them, then approve the shifts that work for you.' },
      { title: 'Get paid by card', body: 'Renters pay upfront through Square and sign your agreement before their first shift.' },
    ]}
    estimator={{
      title: 'See what your downtime is worth',
      unit: 'day',
      rateLabel: 'Rate per shift',
      rate: { min: 50, max: 600, step: 10, initial: 150 },
      periods: { label: 'Shifts booked per month', min: 1, max: 30, initial: 12, suffix: 'shifts' },
      note: 'Estimates only; your rate and bookings set your earnings.',
    }}
    features={[
      { icon: CalendarClock, title: 'Hours that fit your service', body: 'Rent by the hour, shift, day, week or month. Block your own prep and service times so renters never overlap.' },
      { icon: ClipboardCheck, title: 'Documents before approval', body: 'Ask for liability insurance, certifications and a business license, and review them before you say yes.' },
      { icon: CreditCard, title: 'Card payments through Square', body: 'Renters pay upfront by card. Connect your own Square account to be paid directly, or let Vendibook pay out your share.' },
      { icon: ShieldCheck, title: 'Deposits and verified renters', body: 'Collect a refundable security deposit at checkout. Every renter verifies their phone before booking.' },
      { icon: FileSignature, title: 'Signed agreement and house rules', body: 'Each booking comes with an electronically signed rental agreement plus your equipment rules and access instructions.' },
      { icon: MessageSquareLock, title: 'Safe messaging', body: 'Talk to renters inside Vendibook, where every message is scanned for scams and the whole conversation stays on record.' },
    ]}
    spotlight={{
      eyebrow: 'Know your numbers',
      title: 'How much could your idle hours earn?',
      body: 'Plug in your open hours and local rates to see a monthly estimate before you list.',
      cta: { label: 'Open the earnings calculator', to: '/kitchen-earnings-calculator' },
    }}
    faqs={FAQS}
    finalCta={{
      title: 'Ready to fill your kitchen’s quiet hours?',
      body: 'Listing is free and takes a few minutes. You only pay the host fee when a booking is completed.',
      primary: { label: 'List your kitchen', to: LIST_URL },
      secondary: { label: 'Browse shared kitchens', to: '/search?category=ghost_kitchen&mode=rent' },
    }}
    extraSchema={[
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Commercial kitchen rental listings',
        provider: { '@type': 'Organization', name: 'Vendibook', url: 'https://vendibook.com' },
        description: 'List a commercial or shared kitchen for hourly or daily rental to food trucks, caterers and delivery brands.',
        areaServed: 'United States',
        serviceType: 'Kitchen rental marketplace',
      },
    ]}
  >
    <QrSignage />
  </RentalHostLanding>
);

export default RentMyCommercialKitchen;
