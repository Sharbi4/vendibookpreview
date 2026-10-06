import { CalendarCheck, CreditCard, FileSignature, MessageSquareLock, ShieldCheck, Video } from 'lucide-react';
import RentalHostLanding from '@/components/rentals/RentalHostLanding';
import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';

const LIST_URL = '/list/start?mode=rent&category=food_truck';

const FAQS = [
  {
    question: 'Can I rent out my food truck or trailer on Vendibook?',
    answer:
      'Yes. Create a free rental listing, set your daily, weekly or monthly rate, and accept booking requests or turn on Instant Book. You approve who rents and when.',
  },
  {
    question: 'Can I rent it out while I try to sell it?',
    answer:
      'Yes. If your truck or trailer is already listed for sale, add a linked rental in one step from that listing. It earns rental income while you wait for the right buyer, and you can pause rentals anytime.',
  },
  {
    question: 'How do renters pay, and how do I get paid?',
    answer:
      `Renters pay by card through Square at checkout. A booking is only marked paid after Square confirms the payment. Connect your own Square account to be paid directly, or Vendibook pays you your share. Vendibook's host fee is ${FEE_CONFIG.rentalHostFeePct}% of the rental, and listing is free.`,
  },
  {
    question: 'Who can book my truck?',
    answer:
      'Renters book from a Vendibook account, and every message is scanned for scams. You see the renter, their business details and their intended use before you approve a request.',
  },
  {
    question: 'Can I require a security deposit and set rules?',
    answer:
      'Yes. Add a refundable security deposit that is collected at checkout, plus pickup instructions, equipment rules and maintenance notes renters accept before they book.',
  },
  {
    question: 'What happens at pickup and return?',
    answer:
      'Each booking gets a signed rental agreement, and the handoff records the truck’s condition on video at pickup and return, so there is a clear record if anything comes back different.',
  },
];

const RentOutMyFoodTruck = () => (
  <RentalHostLanding
    seo={{
      title: 'Rent Out Your Food Truck or Trailer | Vendibook',
      description:
        'List your food truck or trailer for rent free. Card payments through Square, security deposits, signed agreements and scam-screened messages. Rent it while you sell it.',
      canonical: '/rent-out-my-food-truck',
    }}
    source="rent_out_my_food_truck"
    eyebrow="For food truck & trailer owners"
    headline={{ highlight: 'Rent out your truck.', rest: 'Keep it earning between events.' }}
    subhead="Turn the days your truck sits parked into income. Chefs, caterers and pop-ups book it on your calendar, pay by card upfront, and sign your agreement before they ever pick up the keys."
    primaryCta={{ label: 'List your truck for rent', to: LIST_URL }}
    secondaryCta={{ label: 'Browse trucks for rent', to: '/search?category=food_truck&mode=rent' }}
    proofChips={['Free to list', 'Paid by card through Square', 'Your rules, your calendar']}
    audience={{
      title: 'Who rents food trucks and trailers on Vendibook',
      items: ['Chefs testing a concept', 'Caterers with a big event', 'Pop-ups & festivals', 'Owners whose truck is in the shop', 'New operators before they buy'],
    }}
    steps={[
      { title: 'List it free', body: 'Add photos, your rate and the dates it’s free. If it’s already for sale, add the rental from that listing in one step.' },
      { title: 'Approve the renter', body: 'Review each request, message the renter, and approve. Or turn on Instant Book for dates you’re happy to fill.' },
      { title: 'Hand off and get paid', body: 'The renter pays by card upfront and signs the agreement. You record condition at pickup and return.' },
    ]}
    estimator={{
      title: 'See what your truck could earn',
      unit: 'day',
      rateLabel: 'Daily rate',
      rate: { min: 100, max: 800, step: 25, initial: 300 },
      periods: { label: 'Days booked per month', min: 1, max: 30, initial: 8, suffix: 'days' },
      note: 'Estimates only; your rate and bookings set your earnings.',
    }}
    features={[
      { icon: CreditCard, title: 'Card payments through Square', body: 'Renters pay upfront by card. Connect your own Square account to be paid directly, or let Vendibook pay out your share.' },
      { icon: ShieldCheck, title: 'Deposits and screened renters', body: 'Collect a refundable security deposit at checkout. Renters answer an insurance question before paying, and you decide whether to approve each request or use Instant Book.' },
      { icon: FileSignature, title: 'Signed rental agreement', body: 'Each booking comes with a rental agreement signed electronically, plus your own rules and pickup instructions.' },
      { icon: Video, title: 'Condition record at handoff', body: 'A condition video at pickup and return gives you a clear record of how the truck left and how it came back.' },
      { icon: CalendarCheck, title: 'Your calendar, your rules', body: 'Block dates and set daily, weekly or monthly rates. Pause rentals anytime.' },
      { icon: MessageSquareLock, title: 'Safe messaging', body: 'Talk to renters inside Vendibook, where every message is scanned for scams and the whole conversation stays on record.' },
    ]}
    spotlight={{
      eyebrow: 'Rent it while you sell it',
      title: 'Already selling your truck? Let it pay for itself while you wait.',
      body: 'Add a rental to your sale listing in one step. Buyers still see it’s for sale, renters book the open dates, and you can stop renting the moment it sells.',
      cta: { label: 'Add a rental to my listing', to: '/dashboard/listings' },
    }}
    faqs={FAQS}
    finalCta={{
      title: 'Put your truck to work this month',
      body: 'Listing is free and takes a few minutes. You only pay the host fee when a booking is completed.',
      primary: { label: 'List your truck for rent', to: LIST_URL },
      secondary: { label: 'List a trailer instead', to: '/list/start?mode=rent&category=food_trailer' },
    }}
    extraSchema={[
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Food truck and trailer rental listings',
        provider: { '@type': 'Organization', name: 'Vendibook', url: 'https://vendibook.com' },
        areaServed: 'United States',
        serviceType: 'Food truck rental marketplace',
      },
    ]}
  />
);

export default RentOutMyFoodTruck;
