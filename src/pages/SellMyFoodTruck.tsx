import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCheck,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';

import trailerWeddingFlowers from '@/assets/trailer-wedding-flowers.jpg';
import trailerCreamParty from '@/assets/trailer-cream-party.jpg';
import trailerPinkVintage from '@/assets/trailer-pink-vintage.jpg';

const faqs = [
  {
    question: 'How do I sell my food truck on Vendibook?',
    answer:
      'Start a free for-sale listing and choose the listing experience that works best for you. You can chat with Vendi to build the listing with you or use the standard listing editor. Add your photos, price, location, equipment details, and publish when you are ready.',
  },
  {
    question: 'Does it cost anything to list my food truck?',
    answer:
      'Creating a listing is free. If you arrange payment directly with the buyer in person, there is no Vendibook platform transaction fee. If you choose Vendibook online checkout, the standard seller fee is 12.9%; eligible Vendibook Pro sellers receive the reduced 10.9% rate.',
  },
  {
    question: 'Can buyers finance a food truck or food trailer?',
    answer:
      'Buyer financing options are available through Vendibook financing partners for eligible equipment and applicants. Financing approval and terms are determined by the financing provider.',
  },
  {
    question: 'How do I know what to ask for my food truck?',
    answer:
      'PricePilot can help you compare your truck or trailer against relevant market evidence and build a practical pricing range. Third-party marketplace sold-status records are treated as observed market evidence, not verified closing prices.',
  },
  {
    question: 'Can I sell a food trailer instead?',
    answer:
      'Yes. Vendibook supports food trucks and food trailers, including specialty builds such as coffee, concession, pizza, BBQ, beverage, and mobile kitchen units.',
  },
  {
    question: 'Can the buyer pick it up or have it delivered?',
    answer:
      'Sellers can describe pickup and delivery options in the listing. Vendibook also supports freight and delivery workflows for eligible equipment, so sellers are not limited to buyers in the immediate area.',
  },
  {
    question: 'Can I save my listing and finish it later?',
    answer:
      'Yes. The listing flow supports drafts so you can save your progress, return later, add more photos or details, review the listing, and publish only when you are ready.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Build the listing your way',
    description:
      'Chat with Vendi or use the standard editor. Add your photos, location, price, condition, equipment, pickup or delivery details, and anything buyers should know.',
  },
  {
    number: '02',
    title: 'Review it before it goes live',
    description:
      'Preview the listing, make changes, save a draft if you need more time, and publish only after the details look right.',
  },
  {
    number: '03',
    title: 'Manage buyers and the handoff',
    description:
      'Handle inquiries from your dashboard and choose the payment, pickup, delivery, or freight path that fits the sale.',
  },
];

const sellerFeatures = [
  {
    icon: CreditCard,
    eyebrow: 'More ways to close',
    title: 'Give qualified buyers a financing path.',
    description:
      'Financing availability can help serious buyers explore a purchase without requiring every transaction to be cash-only. Approval and terms come from the financing provider.',
  },
  {
    icon: Package,
    eyebrow: 'Broader buyer reach',
    title: 'Your buyer does not have to live down the street.',
    description:
      'Set pickup and delivery expectations clearly, and use available freight workflows when the equipment and transaction qualify.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Clear transaction choices',
    title: 'Choose the payment path that works for you.',
    description:
      'Keep a sale simple with pay in person, or use Vendibook online checkout when you want the transaction handled through the marketplace workflow.',
  },
  {
    icon: BadgeCheck,
    eyebrow: 'Trust where it matters',
    title: 'Build a listing buyers can understand quickly.',
    description:
      'Strong photos, clear equipment details, accurate condition, location, and optional identity verification all help buyers evaluate the asset with less back-and-forth.',
  },
];

const SellMyFoodTruck = () => {
  const reduceMotion = useReducedMotion();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://vendibook.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Sell My Food Truck',
        item: 'https://vendibook.com/sell-my-food-truck',
      },
    ],
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Sell Your Food Truck on Vendibook',
    description:
      'Create, review, and publish a food truck or food trailer listing on Vendibook, then manage buyer inquiries and the handoff from your dashboard.',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
      url: index === 0 ? 'https://vendibook.com/list?mode=sale' : 'https://vendibook.com/sell-my-food-truck',
    })),
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Food Truck Sales Marketplace',
    description:
      'List a food truck or food trailer for sale on Vendibook with marketplace discovery, buyer financing options, flexible payment paths, and pickup or freight workflows.',
    provider: {
      '@type': 'Organization',
      name: 'Vendibook',
      url: 'https://vendibook.com',
    },
    serviceType: 'Marketplace',
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
  };

  const fadeUp = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.55 },
      };

  return (
    <>
      <SEO
        title="Sell Your Food Truck — Without Getting Buried on Facebook Marketplace"
        description="List your food truck or trailer on Vendibook and reach buyers who are actively searching — not scrolling. Verified inquiries, secure checkout, financing-friendly buyers, and nationwide freight."
        canonical="/sell-my-food-truck"
        type="website"
        ogTitle="Sell Your Food Truck — Without Getting Buried on Facebook Marketplace"
        ogDescription="Reach buyers actively searching for food trucks. Verified inquiries, secure checkout, financing-friendly traffic, nationwide freight."
        twitterTitle="Sell Your Food Truck — Without Getting Buried on Facebook Marketplace"
        twitterDescription="Buyers come to Vendibook ready to buy. List in minutes, get serious inquiries."
      />

      <JsonLd schema={[faqSchema, breadcrumbSchema, howToSchema, serviceSchema]} />

      <div className="min-h-screen flex flex-col bg-[#fbfaf8] text-[#24211e]">
        <Header />

        <main className="flex-1 overflow-hidden">
          <section className="relative pt-10 pb-16 md:pt-16 md:pb-24">
            <div className="container max-w-7xl mx-auto px-4">
              <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-16 items-center">
                <motion.div
                  initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className="max-w-2xl"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#ded7cf] bg-white/80 px-3.5 py-2 text-xs font-medium tracking-wide text-[#5f5851] shadow-sm mb-6">
                    <Truck className="h-3.5 w-3.5" />
                    Sell on Vendibook · Free to list
                  </div>

                  <h1 className="text-[2.65rem] sm:text-5xl lg:text-[4rem] leading-[1.02] tracking-[-0.045em] font-semibold text-[#24211e] mb-6">
                    Sell your food truck where buyers are already looking for one.
                  </h1>

                  <p className="text-lg md:text-xl leading-relaxed text-[#6f675f] max-w-xl mb-8">
                    Give your truck or trailer a polished marketplace listing with room for the photos, equipment, pricing, financing options, and delivery details serious buyers actually need.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <Button size="lg" variant="glass-cta" className="rounded-full px-7 text-base" asChild>
                      <Link to="/list?mode=sale">
                        List my food truck free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-[#d8d1ca] bg-white/70 hover:bg-white px-7 text-base"
                      asChild
                    >
                      <Link to="/how-it-works-seller">See how selling works</Link>
                    </Button>
                  </div>

                  <p className="text-sm text-[#7b736b] mb-8">
                    Free to list · Pay in person with no Vendibook platform transaction fee · Online checkout optional
                  </p>

                  <div className="grid sm:grid-cols-3 gap-4 max-w-xl border-t border-[#e5dfd8] pt-6">
                    <div>
                      <div className="text-sm font-medium text-[#302c28]">Buyer financing</div>
                      <div className="text-xs text-[#847c74] mt-1">Available for eligible applicants and equipment.</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#302c28]">Pickup or freight</div>
                      <div className="text-xs text-[#847c74] mt-1">Set the handoff path that fits your sale.</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#302c28]">Save your draft</div>
                      <div className="text-xs text-[#847c74] mt-1">Come back and finish when you are ready.</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={reduceMotion ? undefined : { opacity: 0, scale: 0.975 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.65, delay: 0.05 }}
                  className="relative"
                >
                  <div className="grid grid-cols-[1.1fr_0.9fr] gap-3 sm:gap-4">
                    <div className="relative overflow-hidden rounded-[32px] bg-[#eee8e1] aspect-[4/5] shadow-[0_24px_70px_rgba(49,42,35,0.12)]">
                      <img
                        src={trailerWeddingFlowers}
                        alt="Food trailer presented for sale"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="grid gap-3 sm:gap-4">
                      <div className="overflow-hidden rounded-[28px] bg-[#eee8e1] aspect-square">
                        <img
                          src={trailerCreamParty}
                          alt="Specialty food trailer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="overflow-hidden rounded-[28px] bg-[#eee8e1] aspect-square">
                        <img
                          src={trailerPinkVintage}
                          alt="Vintage style food trailer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-5 left-4 sm:left-8 max-w-[275px] rounded-[22px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_50px_rgba(42,36,31,0.14)] backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4eee7]">
                        <CheckCircle2 className="h-4 w-4 text-[#5d544b]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2d2925]">A listing built for a serious asset</p>
                        <p className="text-xs leading-relaxed text-[#776f67] mt-1">
                          Photos, equipment, price, financing, pickup and delivery details in one place.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-white border-y border-[#eee8e1]">
            <div className="container max-w-6xl mx-auto px-4">
              <motion.div {...fadeUp} className="max-w-3xl mb-12 md:mb-16">
                <p className="text-sm font-medium text-[#8a7665] mb-3">A marketplace built around mobile food businesses</p>
                <h2 className="text-3xl md:text-[2.8rem] leading-tight tracking-[-0.035em] font-semibold text-[#292521] mb-4">
                  Your food truck deserves more than a one-line classified post.
                </h2>
                <p className="text-lg leading-relaxed text-[#746c64]">
                  Vendibook gives sellers space to explain what the asset actually is, what comes with it, how a buyer can pay, and how the truck or trailer can get to its next owner.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8 md:gap-12 border-t border-[#e9e3dc] pt-9">
                <div>
                  <Camera className="h-5 w-5 text-[#7c6b5b] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Show the whole asset</h3>
                  <p className="text-sm leading-relaxed text-[#7d756d]">
                    Give buyers exterior, interior, equipment and detail photos instead of forcing the sale into a generic classifieds format.
                  </p>
                </div>
                <div>
                  <MessageCircle className="h-5 w-5 text-[#7c6b5b] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Answer the questions up front</h3>
                  <p className="text-sm leading-relaxed text-[#7d756d]">
                    Put condition, location, included equipment, pricing and handoff details where a buyer can understand them before reaching out.
                  </p>
                </div>
                <div>
                  <MapPin className="h-5 w-5 text-[#7c6b5b] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Reach beyond your neighborhood</h3>
                  <p className="text-sm leading-relaxed text-[#7d756d]">
                    Marketplace discovery, buyer financing options and freight workflows can make the asset relevant to buyers outside your immediate area.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-[#f6f2ed]">
            <div className="container max-w-6xl mx-auto px-4">
              <motion.div
                {...fadeUp}
                className="rounded-[34px] border border-white/80 bg-white/72 shadow-[0_26px_80px_rgba(55,45,37,0.08)] backdrop-blur-xl overflow-hidden"
              >
                <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f1ebe4] px-3 py-1.5 text-xs font-medium text-[#66594e] mb-5">
                      <Sparkles className="h-3.5 w-3.5" />
                      List with Vendi
                    </div>
                    <h2 className="text-3xl md:text-4xl tracking-[-0.035em] font-semibold leading-tight mb-4">
                      Don't feel like filling out a long form? Just tell Vendi about it.
                    </h2>
                    <p className="text-base md:text-lg leading-relaxed text-[#746c64] mb-6">
                      Vendi guides you through the important questions in a friendly chat, turns your answers into listing details, lets you upload photos and video, and shows a live preview while you go.
                    </p>
                    <div className="space-y-3 mb-7 text-sm text-[#625b54]">
                      <div className="flex gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7e6e60]" />Asks only the questions that fit your truck or trailer</div>
                      <div className="flex gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7e6e60]" />Shows your listing preview as it comes together</div>
                      <div className="flex gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7e6e60]" />Save a draft and finish later</div>
                      <div className="flex gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7e6e60]" />Nothing publishes until you review and confirm it</div>
                    </div>
                    <Button variant="glass-cta" size="lg" className="rounded-full w-fit px-6" asChild>
                      <Link to="/list?mode=sale">
                        Start my listing
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="p-4 sm:p-6 lg:p-8 bg-white/35">
                    <div className="h-full min-h-[470px] rounded-[28px] border border-white/90 bg-white/72 p-4 sm:p-5 shadow-inner backdrop-blur-xl flex flex-col">
                      <div className="flex items-center justify-between border-b border-[#ece6df] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#efe7df] flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-[#766454]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Vendi</div>
                            <div className="text-xs text-[#8a827a]">Building your listing with you</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-[#8a827a]">Draft saved</div>
                      </div>

                      <div className="grid sm:grid-cols-[1fr_0.95fr] gap-4 flex-1 pt-5">
                        <div className="flex flex-col gap-3">
                          <div className="max-w-[88%] rounded-[18px] rounded-tl-md bg-[#f1ece6] px-4 py-3 text-sm leading-relaxed text-[#514a44]">
                            Tell me a little about what you're selling. You can say it naturally — I'll organize the details for you.
                          </div>
                          <div className="self-end max-w-[90%] rounded-[18px] rounded-tr-md bg-[#2c2926] px-4 py-3 text-sm leading-relaxed text-white">
                            It's a 2019 food trailer in Mesa. Excellent condition. I'm asking $45,000.
                          </div>
                          <div className="max-w-[90%] rounded-[18px] rounded-tl-md bg-[#f1ece6] px-4 py-3 text-sm leading-relaxed text-[#514a44]">
                            Perfect. I've got the year, location, condition and asking price. Add a few photos when you're ready, then we'll cover what's included.
                          </div>
                          <div className="mt-auto rounded-full border border-[#e3ddd6] bg-white px-4 py-3 text-xs text-[#989089]">
                            Type a message or add photos…
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-[#e7e1da] bg-[#fcfbf9] p-3 shadow-sm self-start">
                          <div className="aspect-[4/3] rounded-[17px] overflow-hidden bg-[#eee7df] mb-3">
                            <img src={trailerCreamParty} alt="Example listing preview" className="h-full w-full object-cover" />
                          </div>
                          <p className="text-xs text-[#8b8178] mb-1">Live listing preview</p>
                          <p className="font-medium text-sm leading-snug mb-2">2019 Food Trailer</p>
                          <div className="flex items-center justify-between gap-2 text-xs text-[#716960]">
                            <span>Mesa, AZ</span>
                            <span className="font-medium text-[#342f2a]">$45,000</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-white">
            <div className="container max-w-6xl mx-auto px-4">
              <motion.div {...fadeUp} className="max-w-3xl mb-12">
                <p className="text-sm font-medium text-[#8a7665] mb-3">More than a listing page</p>
                <h2 className="text-3xl md:text-[2.7rem] leading-tight tracking-[-0.035em] font-semibold mb-4">
                  Built around the whole sale, not just the post.
                </h2>
                <p className="text-lg text-[#766e66] leading-relaxed">
                  A food truck is a business asset. The marketplace should give both sides enough structure to make a serious transaction easier to evaluate and complete.
                </p>
              </motion.div>

              <div className="border-y border-[#eae4dd] divide-y divide-[#eae4dd]">
                {sellerFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    {...(reduceMotion
                      ? {}
                      : {
                          initial: { opacity: 0, y: 14 },
                          whileInView: { opacity: 1, y: 0 },
                          viewport: { once: true, amount: 0.3 },
                          transition: { duration: 0.45, delay: index * 0.04 },
                        })}
                    className="grid md:grid-cols-[70px_0.65fr_1.1fr] gap-4 md:gap-8 py-8 md:py-10 items-start"
                  >
                    <div className="h-11 w-11 rounded-full bg-[#f3eee8] flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-[#756556]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#9a8573] mb-2">{feature.eyebrow}</p>
                      <h3 className="text-xl md:text-2xl tracking-[-0.02em] font-medium leading-tight">{feature.title}</h3>
                    </div>
                    <p className="text-sm md:text-base leading-relaxed text-[#776f67] max-w-xl">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-14 md:py-18 bg-[#f7f3ee] border-y border-[#ece5de]">
            <div className="container max-w-6xl mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.035em] mb-2">Free to list</p>
                  <p className="text-sm text-[#7c746c] leading-relaxed">Create and publish your seller listing without an upfront listing charge.</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.035em] mb-2">0% platform fee</p>
                  <p className="text-sm text-[#7c746c] leading-relaxed">When you choose pay in person and handle payment directly with the buyer.</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.035em] mb-2">12.9% / 10.9% Pro</p>
                  <p className="text-sm text-[#7c746c] leading-relaxed">Standard online seller fee, with the reduced rate for eligible Vendibook Pro sellers.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-[#fbfaf8]">
            <div className="container max-w-6xl mx-auto px-4">
              <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-14">
                <p className="text-sm font-medium text-[#8a7665] mb-3">Simple from the start</p>
                <h2 className="text-3xl md:text-[2.7rem] tracking-[-0.035em] font-semibold mb-4">From “I should sell it” to a live listing.</h2>
                <p className="text-lg text-[#756d65]">The flow stays lightweight, but buyers still get the information that matters.</p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8 md:gap-10 max-w-5xl mx-auto">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.number}
                    {...(reduceMotion
                      ? {}
                      : {
                          initial: { opacity: 0, y: 15 },
                          whileInView: { opacity: 1, y: 0 },
                          viewport: { once: true },
                          transition: { duration: 0.45, delay: index * 0.08 },
                        })}
                    className="relative"
                  >
                    <div className="text-xs font-medium text-[#a08c79] mb-4">{step.number}</div>
                    <h3 className="text-xl font-medium tracking-[-0.02em] mb-3">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-[#7a726a]">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 md:py-20 bg-white border-y border-[#eee8e1]">
            <div className="container max-w-5xl mx-auto px-4">
              <motion.div {...fadeUp} className="rounded-[30px] bg-[#f6f1eb] p-7 sm:p-10 md:p-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
                <div>
                  <p className="text-sm font-medium text-[#8a7665] mb-3">Not sure what it's worth?</p>
                  <h2 className="text-2xl md:text-3xl tracking-[-0.03em] font-semibold mb-3">Price with market evidence before you publish.</h2>
                  <p className="text-sm md:text-base leading-relaxed text-[#746c64] max-w-2xl">
                    PricePilot compares the equipment profile with relevant market evidence to help you choose a practical listing position. Marketplace sold-status records are treated as observations, not guaranteed or verified closing prices.
                  </p>
                </div>
                <Button variant="outline" className="rounded-full border-[#d6cec5] bg-white hover:bg-white/80 shrink-0" asChild>
                  <Link to="/tools/pricepilot">
                    Explore PricePilot
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-[#fbfaf8]">
            <div className="container max-w-3xl mx-auto px-4">
              <motion.div {...fadeUp} className="text-center mb-10">
                <p className="text-sm font-medium text-[#8a7665] mb-3">Seller questions</p>
                <h2 className="text-3xl md:text-4xl tracking-[-0.035em] font-semibold">A few things sellers usually want to know.</h2>
              </motion.div>

              <Accordion type="single" collapsible className="w-full border-t border-[#e3ddd6]">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`} className="border-[#e3ddd6]">
                    <AccordionTrigger className="text-left text-base md:text-lg font-medium hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[#746c64] leading-relaxed pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          <section className="py-14 md:py-20 bg-white">
            <div className="container max-w-6xl mx-auto px-4">
              <motion.div
                {...fadeUp}
                className="relative overflow-hidden rounded-[34px] border border-[#eee6de] bg-[#f5eee7] px-6 py-12 sm:px-10 md:px-14 md:py-16"
              >
                <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-white/50 blur-3xl" aria-hidden="true" />
                <div className="relative max-w-3xl">
                  <FileCheck className="h-6 w-6 text-[#7b6756] mb-5" />
                  <h2 className="text-3xl md:text-[2.8rem] leading-tight tracking-[-0.04em] font-semibold mb-4">
                    Ready to give your food truck a better place to sell?
                  </h2>
                  <p className="text-base md:text-lg text-[#756c63] leading-relaxed max-w-2xl mb-7">
                    Start free, build the listing at your own pace, and publish when the photos, price and details feel right.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" variant="glass-cta" className="rounded-full px-7" asChild>
                      <Link to="/list?mode=sale">
                        List my food truck free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full border-[#d5cdc4] bg-white/70 hover:bg-white" asChild>
                      <Link to="/food-trucks-for-sale">Browse food trucks for sale</Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5ded7] bg-[#fbfaf8]/94 p-3 backdrop-blur-xl md:hidden">
          <Button variant="glass-cta" size="lg" className="w-full rounded-full" asChild>
            <Link to="/list?mode=sale">
              List my food truck free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default SellMyFoodTruck;
