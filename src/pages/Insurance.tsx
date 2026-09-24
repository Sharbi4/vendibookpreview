import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ShieldCheck, FileCheck2, Truck, Store, Check } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { FLIP_INSURANCE as flip } from '@/lib/flipInsurance';
import './insurance.css';
import { hasAnalyticsConsent } from '@/lib/cookieConsent';

function InsuranceLink({ children = 'Get insurance through FLIP', owner = false }: { children?: React.ReactNode; owner?: boolean }) {
  if (!flip.enabled) return <Link className="insurance-cta" to="/contact">Ask about insurance<ArrowRight /></Link>;
  return <a className="insurance-cta" href={owner ? flip.ownerUrl : flip.partnerUrl} target="_blank" rel="noopener noreferrer sponsored"
    onClick={() => {
      try {
        if (!hasAnalyticsConsent()) return;
        const analytics = window as unknown as { dataLayer?: Record<string, unknown>[] };
        analytics.dataLayer?.push({ event: 'flip_insurance_cta_clicked', source: 'insurance_page', audience: owner ? 'owner' : 'renter' });
      } catch { /* Analytics must never interrupt the partner link. */ }
    }}>{children}<ArrowUpRight aria-hidden="true" /></a>;
}

const steps = [
  ['01', 'Choose your rental', 'Find your food truck or trailer and review the host’s insurance requirements.'],
  ['02', 'Explore coverage', 'Use our partner link to apply and purchase directly through FLIP. Confirm that the policy fits your operation.'],
  ['03', 'Keep your documents', 'After issuance, save your policy and Certificate of Insurance (COI). Share required documents through your rental’s document process.'],
  ['04', 'Prepare for handoff', 'Confirm the required documents with your host, coordinate pickup or delivery, and complete your walkthrough.'],
];
const questions = [
  ['Is insurance included with my booking?', 'No. Booking through Vendibook does not automatically insure you or the equipment. Insurance is purchased separately from a provider, and any host requirements still apply.'],
  ['What is a Certificate of Insurance?', 'A COI summarizes evidence of an issued policy. Review the actual policy and any required endorsements with your provider; a certificate alone does not establish that every rental risk is covered.'],
  ['Will Vendibook receive my documents?', 'When applicable, documents issued through our partner pathway can be shared with Vendibook for the rental process. Keep your own copy and complete any document requests shown in your booking. Opening the FLIP link does not confirm receipt or approval.'],
  ['Can I use another insurance provider?', 'Yes. You may use another provider whose coverage and documentation satisfy the host’s requirements. Ask your host about the required limits, dates, and additional insured wording before purchasing.'],
  ['Does a renter’s policy cover the owner or vehicle?', 'Do not assume it does. Owners and renters should separately confirm coverage for their roles, the specific equipment, rented property, and any driving or towing with a licensed insurance professional.'],
  ['Where can I check prices and coverage details?', 'FLIP provides current pricing, eligibility, policy terms, limits, exclusions, and available options during its application process. Contact FLIP for policy advice and Vendibook for questions about your booking.'],
];

export default function Insurance() {
  return <div className="insurance-page">
    <SEO title="Food Truck & Food Trailer Insurance | Vendibook + FLIP" description="Explore food-business insurance through Vendibook’s partnership with FLIP. Learn about rental requirements, proof of insurance, and options for owners and operators." canonical="/insurance" />
    <Header />
    <main>
      <section className="insurance-hero insurance-wrap">
        <div>
          <Link to="/" className="insurance-breadcrumb">Vendibook / Insurance</Link>
          <p className="insurance-eyebrow">Vendibook + FLIP</p>
          <h1>Food Truck &amp;<br />Food Trailer<br /><em>Insurance.</em></h1>
          <p className="insurance-intro">Your next move deserves a little more certainty.</p>
          <p className="insurance-body">From your first rental to your next season on the road, explore food-business insurance through Vendibook’s partnership with FLIP.</p>
          <div className="insurance-actions"><InsuranceLink /><a href="#how-it-works" className="insurance-text-link">How it works<ArrowRight /></a></div>
          <p className="insurance-small">Apply and purchase directly through FLIP. Opens in a new tab.</p>
        </div>
        <div className="insurance-partner-card">
          <div className="insurance-logo"><img src={flip.logoUrl} alt="FLIP — Food Liability Insurance Program" width="300" height="130" /></div>
          <p className="insurance-eyebrow">Insurance for food businesses</p>
          <h2>Built around<br />what you do.</h2>
          <p>Access insurance options for your food-business operation, with application and policy management handled by FLIP.</p>
          <ul>{['Explore options for your business','Review your policy before you buy','Keep proof of insurance on hand'].map(item => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
          <span className="insurance-partner-note">Insurance available through FLIP · Not automatically included with a rental</span>
        </div>
      </section>

      <section className="insurance-journey" id="how-it-works"><div className="insurance-wrap">
        <p className="insurance-eyebrow">One connected rental journey</p><h2>Find it. Plan ahead. Keep moving.</h2>
        <div className="insurance-steps">{steps.map(([number,title,body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </div></section>

      <section className="insurance-wrap insurance-section">
        <div className="insurance-section-head"><p className="insurance-eyebrow">The right questions, before the keys</p><h2>Coverage should fit<br />your actual operation.</h2><p>Tell FLIP what you rent, own, serve, and move. Confirm the details with a licensed insurance professional.</p></div>
        <div className="insurance-grid">
          <article><ShieldCheck /><h3>Your business</h3><p>Discuss food-business liability and the activities you plan to carry out.</p></article>
          <article><Truck /><h3>Your truck or trailer</h3><p>Ask about the specific vehicle, equipment, rented property, and any driving or towing.</p></article>
          <article><FileCheck2 /><h3>Your rental requirements</h3><p>Check policy dates, host requirements, and any additional insured endorsements before handoff.</p></article>
        </div>
      </section>

      <section className="insurance-wrap"><div className="insurance-owner"><div><Store aria-hidden="true" /><p className="insurance-eyebrow">For hosts &amp; owners</p><h2>Your equipment.<br />Your own coverage questions.</h2><p>FLIP is also a resource for food-business owners. Discuss your business and rental activities directly with FLIP to find out which options may fit. A renter’s policy does not automatically cover you or your asset.</p></div><InsuranceLink owner>Explore owner insurance options</InsuranceLink></div></section>

      <section className="insurance-wrap insurance-section insurance-faq"><div><p className="insurance-eyebrow">A little clarity goes a long way</p><h2>Before you<br />get started.</h2><Link to="/contact" className="insurance-text-link">Questions about a booking?<ArrowRight /></Link></div><div>{questions.map(([q,a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>

      <section className="insurance-wrap insurance-section"><p className="insurance-eyebrow">From our insurance partner</p><h2>Useful reading for the road ahead.</h2><div className="insurance-grid insurance-resources">{flip.resources.map(resource => <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer"><span>FLIP resource<ArrowUpRight /></span><h3>{resource.title}</h3><p>{resource.description}</p></a>)}</div>
        <div className="insurance-recognition"><img src="/partners/flip-cnbc-2025.png" width="1261" height="1047" loading="lazy" alt="CNBC World's Top Fintech Companies 2025, in cooperation with Statista" /><p>FLIP’s parent company, Veracity Insurance Solutions, was named to CNBC’s 2025 World’s Top Fintech Companies list.<br /><a href="https://www.fliprogram.com/blog/veracity-flip-recognized-cnbc-top-fintech-companies-2025" target="_blank" rel="noopener noreferrer">Read FLIP’s announcement<ArrowUpRight /></a></p></div>
      </section>

      <section className="insurance-wrap insurance-final"><p className="insurance-eyebrow">Ready for your next chapter?</p><h2>Find the equipment.<br />Prepare for what’s next.</h2><div className="insurance-actions"><InsuranceLink /><Link to="/search?mode=rent" className="insurance-text-link">Browse rentals<ArrowRight /></Link><Link to="/list" className="insurance-text-link">List your equipment<ArrowRight /></Link></div><p className="insurance-disclosure">Insurance products are available through FLIP and subject to eligibility requirements, policy terms, conditions, limits, and exclusions. Vendibook is not the insurer and does not underwrite or guarantee coverage. Purchasing insurance does not replace the rental agreement or the host’s requirements.</p></section>
    </main><Footer />
  </div>;
}
