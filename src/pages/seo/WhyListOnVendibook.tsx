import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Camera, MessageSquare, FileSignature, Truck, Sparkles, SlidersHorizontal, Video, CheckCircle2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import sellerImage from '@/assets/how-selling-hero.jpg';
import handoffArt from '@/assets/education/sign.svg';

const benefits = [
  { icon: Camera, title: 'Show what makes it worth it.', body: 'Give buyers the full picture: kitchen equipment, power, dimensions, condition, photos, and video. Built around the details food business owners need.' },
  { icon: MessageSquare, title: 'Keep the conversation moving.', body: 'Answer questions, schedule a video walkthrough, and respond to written offers. Keep the discussion connected to your equipment.' },
  { icon: SlidersHorizontal, title: 'You decide what works.', body: 'Set your asking price. Accept, decline, or counter offers. Review the purchase and fulfillment details before the buyer pays online.' },
  { icon: FileSignature, title: 'Stay organized beyond the sale.', body: 'Payment status, delivery updates, handoff evidence, and signed documents stay connected to the transaction in your account.' },
];
const steps = [
  { title: 'Create your listing', body: 'Add your photos, equipment details, location, and asking price. Standard listings are free to publish.' },
  { title: 'Meet your next buyer', body: 'Message interested buyers, schedule a walkthrough, and work through offers in writing.' },
  { title: 'Approve the purchase', body: 'Agree on the deal and fulfillment. You accept first; the buyer then reviews the final total and submits online payment.' },
  { title: 'Complete the handoff', body: 'Coordinate pickup or delivery, document condition together, complete signatures, and confirm the handoff.' },
];
const faqs = [
  { question: 'Is it free to list?', answer: 'Yes. Standard listings are free to create and publish. Optional promotions are paid, and applicable transaction fees are shown separately. You can review payment and fee details before choosing how to sell.' },
  { question: 'Do I have to connect PayPal before publishing?', answer: 'No. You can create and publish a listing before setting up online payments. To accept PayPal checkout, complete the required account connection and payment-readiness steps. Pay in Person is available where your listing allows it.' },
  { question: 'What happens after I accept a purchase?', answer: 'For online checkout, the buyer reviews the final amount and submits payment. Once payment is verified, coordinate the agreed pickup, seller delivery, or freight. At handoff, document condition with a walkthrough and photos, complete the required signatures, and confirm the handoff.' },
  { question: 'Can a buyer finance my equipment?', answer: 'Eligible buyers can explore equipment financing with third-party partners. Approval, terms, and funding are determined by the lender. Vendibook does not guarantee financing or act as the lender.' },
  { question: 'Can I rent equipment while it is listed for sale?', answer: 'Eligible owners can offer equipment for sale and rent. Keep availability accurate, review rental requests, and coordinate existing commitments before accepting a purchase.' },
  { question: 'Are a sale or buyer inquiries guaranteed?', answer: 'No. Accurate pricing, complete specifications, clear photos, and responsive communication help buyers evaluate your listing. Optional promotion increases placement opportunities; it does not guarantee inquiries or a sale.' },
];

export default function WhyListOnVendibook() {
  const reduce = useReducedMotion();
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.5 } };
  return <div className="sale-light min-h-screen bg-[#faf8f5] text-[#26211d]">
    <SEO title="Why Sell on Vendibook? | Food Trucks & Trailers" description="List your food truck or trailer free. Connect with buyers, manage offers, and keep payment, delivery, and signed paperwork together." canonical="https://vendibook.com/why-list-on-vendibook" />
    <JsonLd schema={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }} />
    <Header />
    <main>
      <section className="relative overflow-hidden border-b border-[#e5ddd4]">
        <div aria-hidden className="pointer-events-none absolute -top-36 right-0 h-[500px] w-[500px] rounded-full bg-orange-200/25 blur-[100px]" />
        <div className="container max-w-6xl mx-auto px-5 pt-10 pb-16 md:pt-16 md:pb-24">
          <Link to="/" className="text-xs text-[#796e65] hover:text-primary">Vendibook / For sellers</Link>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mt-10">
            <motion.div {...reveal}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-5">Built for your next chapter</p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] leading-[1.06] font-semibold tracking-tight">Your equipment.<br />Someone else's<br /><span className="text-primary">next big move.</span></h1>
              <p className="mt-6 text-lg leading-relaxed text-[#796e65] max-w-lg">Sell your food truck or trailer in a marketplace built for the people who know what it's worth.</p>
              <p className="mt-4 leading-relaxed text-[#796e65] max-w-lg">From the first question to the final signature, keep your listing, buyer conversations, and transaction moving together.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild variant="cta" size="lg" className="rounded-full"><Link to="/list">List now — it's free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="cta-outline" size="lg" className="rounded-full"><Link to="/browse">Browse the market</Link></Button></div>
              <p className="mt-5 text-xs text-[#796e65] flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Free standard listings. Optional promotion. Your choice.</p>
            </motion.div>
            <motion.div {...reveal} className="relative pb-9 lg:pl-4">
              <div className="overflow-hidden rounded-[32px] border border-[#e2d8cc] bg-white shadow-[0_30px_80px_-45px_rgba(49,29,12,.45)]"><img src={sellerImage} alt="Food trailer ready for its next owner" className="aspect-[5/4] w-full object-cover" /><div className="p-6 flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-[#796e65]">Made for mobile food</p><p className="mt-1 font-semibold">A listing that tells the whole story.</p></div><ArrowUpRight className="text-primary shrink-0" /></div></div>
              <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }} className="absolute bottom-0 left-3 right-7 rounded-2xl border border-[#e2d8cc] bg-[#fffdf9] p-5 shadow-lg flex items-center gap-4"><span className="h-11 w-11 rounded-full bg-orange-50 flex items-center justify-center"><Video className="text-primary h-5 w-5" /></span><div><p className="font-medium text-sm">Let buyers see it for themselves.</p><p className="text-xs text-[#796e65] mt-1">Photos, specifications, and scheduled walkthroughs.</p></div></motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      <section className="container max-w-6xl mx-auto px-5 py-16 md:py-24">
        <motion.div {...reveal} className="max-w-2xl mb-9"><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Why sell on Vendibook</p><h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">Give the right buyer<br />a reason to take the next step.</h2></motion.div>
        <div className="grid sm:grid-cols-2 gap-5">{benefits.map(b => <motion.article key={b.title} {...reveal} whileHover={reduce ? undefined : { y: -4 }} className="rounded-[26px] border border-[#e5ddd4] bg-[#fffdf9] p-7 md:p-8 shadow-[0_15px_35px_-30px_rgba(45,31,20,.3)]"><b.icon className="h-6 w-6 text-primary mb-6" /><h3 className="text-xl font-semibold tracking-tight">{b.title}</h3><p className="mt-3 text-[#796e65] leading-relaxed">{b.body}</p></motion.article>)}</div>
      </section>
      <section className="bg-[#26211d] text-[#fffaf3] py-16 md:py-24"><div className="container max-w-6xl mx-auto px-5 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
        <motion.div {...reveal}><p className="text-xs uppercase tracking-[0.18em] text-orange-300 font-semibold">A clear path to sold</p><h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-4">You're in control.<br />The details stay connected.</h2><p className="mt-5 text-[#c9beb3] leading-relaxed">You approve the deal before the buyer pays online. Then follow the transaction through pickup or delivery, the condition walkthrough, and signatures.</p><Button asChild variant="cta" size="lg" className="mt-7 rounded-full"><Link to="/list">Start my listing <ArrowRight className="h-4 w-4 ml-2" /></Link></Button></motion.div>
        <ol className="space-y-7">{steps.map((step, index) => <motion.li {...reveal} key={step.title} className="flex gap-5"><span className="text-sm font-semibold text-orange-300 pt-1">0{index + 1}</span><div className="border-b border-white/15 pb-7 w-full"><h3 className="text-xl font-semibold">{step.title}</h3><p className="text-[#c9beb3] leading-relaxed mt-2">{step.body}</p></div></motion.li>)}</ol>
      </div></section>
      <section className="container max-w-6xl mx-auto px-5 py-16 md:py-24 grid lg:grid-cols-2 gap-6">
        <motion.article {...reveal} className="rounded-[28px] bg-[#eee8df] border border-[#ded4c8] p-8 md:p-10"><Truck className="h-7 w-7 text-primary" /><h2 className="text-2xl font-semibold tracking-tight mt-6">Make distance part of the plan.</h2><p className="mt-3 text-[#796e65] leading-relaxed">Discuss buyer pickup, seller delivery, or Vendibook Freight where available. Eligible buyers can also explore financing with third-party partners.</p><Link className="mt-6 inline-flex items-center gap-2 font-medium" to="/how-it-works">See the full process <ArrowRight className="h-4 w-4" /></Link></motion.article>
        <motion.article {...reveal} className="rounded-[28px] bg-[#fffdf9] border border-[#e5ddd4] p-8 md:p-10"><Sparkles className="h-7 w-7 text-primary" /><h2 className="text-2xl font-semibold tracking-tight mt-6">Start free. Build from there.</h2><p className="mt-3 text-[#796e65] leading-relaxed">Publish your standard listing at no cost. Add optional promotion when you're ready, or offer eligible equipment for rent while keeping your calendar up to date.</p><Link className="mt-6 inline-flex items-center gap-2 font-medium" to="/payments">Understand payments & fees <ArrowRight className="h-4 w-4" /></Link></motion.article>
      </section>
      <section className="container max-w-4xl mx-auto px-5 pb-16 md:pb-24"><h2 className="text-3xl font-semibold tracking-tight mb-7">A few things worth knowing.</h2>{faqs.map(f => <details key={f.question} className="group border-b border-[#ded4c8] py-5"><summary className="cursor-pointer font-medium text-lg marker:text-primary">{f.question}</summary><p className="mt-3 leading-relaxed text-[#796e65] max-w-3xl">{f.answer}</p></details>)}</section>
      <section className="container max-w-6xl mx-auto px-5 pb-16 md:pb-24"><motion.div {...reveal} className="relative overflow-hidden rounded-[32px] border border-orange-200/70 bg-[#f4ece2] p-8 md:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Make room for what's next</p><h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-4">Your next chapter<br />starts with a listing.</h2><p className="mt-4 text-[#796e65]">Give your equipment a place to be discovered.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild variant="cta" size="lg"><Link to="/list">List now <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="cta-outline" size="lg"><Link to="/browse">Browse now</Link></Button></div></div><img src={handoffArt} alt="Signed documents at the completed handoff" loading="lazy" className="w-52 lg:w-64 justify-self-center" /></motion.div></section>
    </main><Footer />
  </div>;
}
