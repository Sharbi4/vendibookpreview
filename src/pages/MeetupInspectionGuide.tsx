import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Printer, ShieldCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';

const sections = [
  { id: 'before-you-meet', title: 'Before you meet', items: ['Confirm the time and exact location in Vendibook Messages.', 'Re-read the listing, equipment list, agreed price, and any written seller disclosures.', 'Make a short list of anything you want demonstrated.', 'Bring a charged phone for photos and notes.', 'For high-value or mechanical equipment, consider bringing a qualified independent inspector or mechanic.', 'If title or registration applies, know which documents you expect to review.'] },
  { id: 'meetup-safety', title: 'Meetup safety', items: ['Meet during daylight when practical.', 'Tell someone where you are going.', 'If the asset must be inspected at a private shop, home, or yard, use reasonable judgment and do not proceed if the situation feels unsafe.', 'Keep material transaction communication in Vendibook.', 'Do not send an unrecorded off-platform payment just because someone requests it at the meetup.'] },
  { id: 'match-the-listing', title: 'Confirm the asset matches the listing', items: ['Make, model, and year where applicable.', 'VIN, serial number, or identifying plate where applicable.', 'Overall dimensions.', 'Major equipment included in the sale.', 'Visible condition compared with photos.', 'Seller-disclosed defects or repairs.'] },
  { id: 'motorized-checks', title: 'Food truck and motorized vehicle checks', intro: 'For motorized food trucks, this is a basic walkthrough—not a mechanical inspection.', items: ['Odometer or mileage where applicable.', 'Engine start, idle, and warning lights.', 'Transmission and basic movement where safe and lawful.', 'Brakes and parking brake.', 'Tires and wheel condition.', 'Lights and turn signals.', 'Battery.', 'Visible fluid leaks.', 'HVAC and cab controls where applicable.'] },
  { id: 'towable-checks', title: 'Trailer and towable checks', intro: 'These checks are not a substitute for a professional inspection.', items: ['VIN or serial plate.', 'Frame, tongue, and coupler.', 'Safety chains.', 'Jack.', 'Tires, wheels, and axles.', 'Trailer lights.', 'Brakes and breakaway system if equipped.', 'Exterior seams, roof, and visible water intrusion.'] },
  { id: 'kitchen-systems', title: 'Kitchen and food-service systems', intro: 'Ask the seller to demonstrate systems when practical and safe.', items: ['Hood and ventilation.', 'Fire suppression tag or system where present.', 'Cooking equipment.', 'Refrigeration and freezers.', 'Sinks.', 'Fresh and waste water tanks.', 'Pumps, plumbing, and visible leaks.', 'Electrical panel and outlets.', 'Shore power connection.', 'Generator.', 'Propane or fuel systems where applicable.', 'Hot water.', 'Interior surfaces and floors.', 'Equipment startup or demonstration where practical.'] },
  { id: 'documents', title: 'Documents to review', intro: 'Requirements vary by state and asset type. Vendibook does not provide legal or title advice.', items: ['Title or ownership document where applicable.', 'Seller identification and name consistency where appropriate.', 'Bill of sale or purchase agreement.', 'VIN or serial consistency.', 'Lien release when the seller disclosed a prior lien or one is otherwise required.', 'Equipment manuals or service records if offered.', 'Keys.', 'Any included transferable records.'] },
  { id: 'document-condition', title: 'Document the condition', items: ['Capture photos or video of the exterior and interior.', 'Record the identifying plate, VIN, or serial number if appropriate.', 'Photograph included equipment.', 'Note any discrepancy in the Vendibook order or message record.', 'Record the odometer where applicable.', 'Document keys and documents received.'] },
  { id: 'before-complete', title: 'Before you complete the handoff', items: ['The asset and included items match the agreement closely enough for you to proceed.', 'Agreed included equipment is present.', 'Required documents and keys are received, or the next document step is clearly recorded.', 'Pickup or delivery status is accurate in Vendibook.', 'Any material issue is documented before marking the handoff complete.'] },
  { id: 'something-doesnt-match', title: "If something doesn't match", items: ['Pause the handoff.', 'Document the issue with photos and messages.', 'Ask the seller to clarify.', 'Use Vendibook support or dispute tools if needed.', 'Do not mark the handoff complete merely to move the app forward.'] },
];

export default function MeetupInspectionGuide() {
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo');
  const safeReturn = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null;
  const transactionId = params.get('transactionId');
  const bookingId = params.get('bookingId');
  const { data: loadedContext } = useHandoffContext({ transactionId, bookingId });

  const publicMode = parsePublicMode(params.get('mode'));
  const publicFulfillment = parsePublicFulfillment(params.get('fulfillment'));
  const context: HandoffContext | null =
    loadedContext ??
    (publicMode || publicFulfillment
      ? {
          mode: publicMode ?? 'sale',
          fulfillment: publicFulfillment ?? 'pickup',
          real: false,
        }
      : null);


  return (
    <div className="guide-page min-h-dvh">
      <SEO title="Food Truck & Trailer Meetup and Inspection Guide | Vendibook" description="Prepare for an in-person food truck or trailer meetup with a practical inspection checklist, document review, handoff tips, and next steps." canonical="/guides/meetup-inspection" type="article" />
      <Header />
      <main>
        <header className="guide-hero">
          <div className="guide-wrap">
            <p>Before the handoff</p>
            <h1>Know what to look for when you meet the seller.</h1>
            <span>A meetup is your chance to compare the equipment with the listing, ask final questions, review key documents, and document the handoff.</span>
            <div className="guide-actions">
              <Button asChild variant="outline"><Link to={safeReturn ?? '/browse'}><ArrowLeft />{safeReturn ? 'Back to your order' : 'Browse listings'}</Link></Button>
              <Button variant="ghost" onClick={() => window.print()}><Printer /> Print guide</Button>
            </div>
          </div>
        </header>

        <div className="guide-layout guide-wrap">
          <aside>
            <div className="guide-contents">
              <strong>Contents</strong>
              {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
            </div>
          </aside>
          <article>
            <div className="guide-note"><ShieldCheck aria-hidden /><p><strong>Practical marketplace education</strong><span>This guide is not a guarantee or a professional inspection.</span></p></div>
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <div className="guide-section-title"><ClipboardCheck aria-hidden /><h2>{section.title}</h2></div>
                {section.intro ? <p className="guide-intro">{section.intro}</p> : null}
                <ul>{section.items.map((item) => <li key={item}><CheckCircle2 aria-hidden /><span>{item}</span></li>)}</ul>
              </section>
            ))}
            <section className="guide-disclaimer">
              <h2>Disclaimer</h2>
              <p>This guide is general marketplace information, not a professional vehicle, mechanical, safety, title, legal, tax, or regulatory inspection. For a high-value purchase or when condition or title is uncertain, consider an appropriate qualified professional.</p>
              <p>Vendibook does not confirm title validity, and an in-app handoff status does not transfer legal title.</p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}