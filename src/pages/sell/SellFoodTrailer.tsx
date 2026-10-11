import { Link } from 'react-router-dom';
import { ArrowRight, Check, MapPin, Truck, Video } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { PayPalWordmark, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import trailerPhoto from '@/assets/trailer-white.jpg';
import './sell-food-trailer.css';

const steps = [
  ['Start with a conversation', 'Share clear photos, equipment details, and condition. Answer questions in messages and schedule a video walkthrough from an eligible listing before the buyer commits.'],
  ['Approve the purchase. Then the buyer pays.', 'Review the purchase request first. After you approve, the buyer reviews the final details and submits payment through PayPal when online checkout is enabled. For Pay in Person, agree how payment will be made directly.'],
  ['Coordinate pickup or delivery', 'Keep the agreed method, timing, and location with the transaction. Tracking appears when the assigned seller or driver starts Delivery Mode.'],
  ['Walk through the trailer together', 'At pickup or drop-off, review the equipment and document its condition with a video walkthrough and photos. Raise any issue through the transaction before confirming the handoff.'],
  ['Sign, confirm, and keep the record', 'Complete the applicable online agreement signatures and handoff confirmations. Messages, agreements, payment records, and handoff evidence stay together in the transaction.'],
];
const faqs = [
  ['Is it free to list my food trailer?', 'A standard listing is free. Optional listing upgrades and services have separate pricing. Review the applicable fees before choosing an upgrade or payment method.'],
  ['Can I offer financing to buyers?', 'Enable the Equinox Funding add-on on an eligible for-sale listing so buyers can apply with the financing partner. Financing is subject to lender approval and terms. Neither Vendibook nor the seller provides the loan.'],
  ['Do I have to accept online payments?', 'Where available, offer PayPal online checkout, Pay in Person, or both. Pay in Person is settled directly with the buyer and does not incur the Vendibook online transaction commission. Optional paid services remain separately priced.'],
  ['What happens after the buyer pays?', 'Coordinate pickup or delivery, document the condition at handoff, and complete the applicable signatures and confirmations. Follow your transaction for verified payment status and outstanding steps.'],
];
const Action = () => <div className="st-actions"><Link className="st-primary" to="/list/start">List your trailer free <ArrowRight size={18} /></Link><Link className="st-link" to="/food-trailers-for-sale">Explore food trailers <ArrowRight size={17} /></Link></div>;

export default function SellFoodTrailer() {
  return <div className="sale-light sell-trailer-page">
    <SEO title="Sell Your Food Trailer Online | Vendibook" description="List your food trailer for free. Connect with buyers, offer eligible financing, and coordinate payment, delivery, walkthroughs, and signatures in one place." canonical="/sell-food-trailer" />
    <JsonLd schema={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }} />
    <Header /><main>
      <section className="st-wrap st-hero" aria-labelledby="st-title"><div><span className="st-eyebrow">For the next chapter of your business</span><h1 id="st-title">Sell your food trailer.<br /><em>Move your business forward.</em></h1><p>From coffee trailers to fully equipped mobile kitchens, reach people ready to build something. Bring the conversation, payment, and final handoff together on Vendibook.</p><Action /><div className="st-benefits">{['Free standard listing', 'You approve the purchase', 'One transaction record'].map(t => <span key={t}><Check size={16} />{t}</span>)}</div></div><div className="st-photo"><img src={trailerPhoto} alt="White food trailer" fetchPriority="high" /><div><span>Your trailer. Their next beginning.</span><strong>Built for the mobile food community.</strong></div></div></section>
      <section className="st-wrap st-section" aria-labelledby="st-partners-title"><span className="st-eyebrow">More ways to move the deal forward</span><h2 id="st-partners-title">Give buyers a clear path to yes.</h2><p>A great listing starts the conversation. Payment and financing options help buyers take the next step.</p><div className="st-partners">
        <article className="st-partner st-paypal"><PayPalWordmark surface="dark" className="!h-9 !w-auto" /><span className="st-label">Online payment partner</span><h3>Familiar checkout.<br />Connected to your sale.</h3><p>Vendibook integrates PayPal checkout on eligible listings. Complete seller onboarding to receive online payments, then let your buyer review the agreed order and pay after you approve.</p><p className="st-note">Available methods and eligibility are determined by PayPal. Your transaction shows the verified payment status.</p><Link className="st-link" to="/payments">Explore payment options <ArrowRight size={17} /></Link></article>
        <article className="st-partner st-finance"><EquinoxFundingLogo className="!h-9 !w-auto" /><span className="st-label">Third-party equipment financing</span><h3>Offer buyers a way<br />to explore financing.</h3><p>Enable the Equinox Funding add-on on an eligible trailer listing. Buyers can explore financing and apply with the lending partner while you keep the sale moving in Vendibook.</p><p className="st-note">Subject to lender approval and terms. You are selling your trailer, not making a loan. Optional add-on pricing is shown before purchase.</p><Link className="st-link" to="/financing">How financing works <ArrowRight size={17} /></Link></article>
      </div></section>
      <section className="st-process st-section" aria-labelledby="st-process-title"><div className="st-wrap st-split"><div><span className="st-eyebrow">Beyond the listing</span><h2 id="st-process-title">A real process.<br />All the way to handoff.</h2><p>Know what happens next, even after the buyer pays. Keep each step connected to the deal.</p><Link className="st-link" to="/how-it-works">See how Vendibook works <ArrowRight size={17} /></Link></div><ol>{steps.map(([title, body], i) => <li key={title}><span className="st-number">0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></div></section>
      <section className="st-wrap st-section" aria-labelledby="st-delivery-title"><span className="st-eyebrow">Agree on the destination</span><h2 id="st-delivery-title">Three ways to complete the handoff.</h2><p>Choose the options that work for your trailer and confirm the details with your buyer.</p><div className="st-delivery">{[
        { icon: MapPin, title: 'Buyer pickup', text: 'Meet at the agreed location. Walk through the trailer, record its condition, and complete the applicable signatures and pickup confirmation together.' },
        { icon: Truck, title: 'Seller delivery', text: 'Agree on cost and timing, use Delivery Mode where available, and document the condition at drop-off before confirming the handoff.' },
        { icon: Video, title: 'Vendibook Freight', text: 'Explore coordinated transport where available. Record the condition at carrier pickup and delivery, with the applicable handoff documents.' },
      ].map(({ icon: Icon, title, text }) => <article key={title}><Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div><Link className="st-link" to="/ship-your-food-truck">Explore freight support <ArrowRight size={17} /></Link></section>
      <section className="st-wrap st-section st-split" aria-labelledby="st-faq-title"><div><span className="st-eyebrow">Before you list</span><h2 id="st-faq-title">Clear answers.<br />Confident next steps.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      <section className="st-wrap st-final"><span className="st-eyebrow">Make room for what’s next</span><h2>Your next buyer starts<br />with your next listing.</h2><p>Add the photos. Tell the story. Put your trailer to work for its next owner.</p><Action /></section>
    </main><Footer /></div>;
}
