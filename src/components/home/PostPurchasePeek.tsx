import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowRight, X } from 'lucide-react';

/*
 * After-you-buy peek, placed inside the Vendibook Guarantee section.
 * One button opens a glass popup holding the order-journey image.
 * Copy guardrails: illustrative order view only — no tracking, insurance,
 * escrow or timing promises. Tracking depends on the fulfillment method,
 * driver consent and connection.
 */

const JOURNEY_IMG = '/images/operations/buyer-order-journey.png';

const PEEK_STEPS = [
  { title: 'Payment on record', text: 'Find your payment status and receipt in your account.' },
  { title: 'Follow delivery', text: 'See shared location and current route estimates when available.' },
  { title: 'Complete the handoff', text: 'Review the equipment, save the walkthrough, sign and confirm receipt.' },
];

export function PostPurchasePeek() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="hb-peek-trigger" onClick={() => setOpen(true)} data-cta-location="home_guarantee_post_purchase_peek">
        Know what happens after you buy from Vendibook<ArrowRight aria-hidden="true" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="hb-peek-overlay" />
          <DialogPrimitive.Content className="hb-peek-modal" aria-labelledby="hb-peek-modal-title">
            <DialogPrimitive.Description className="hb-peek-sr">
              A preview of the Vendibook order view: payment, delivery progress and handoff steps.
            </DialogPrimitive.Description>

            <div className="hb-peek-head">
              <div>
                <p className="hb-eyebrow">After you buy</p>
                <DialogPrimitive.Title id="hb-peek-modal-title" className="hb-peek-modal-title">
                  Know what happens after you buy from Vendibook
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close className="hb-peek-close">
                <X aria-hidden="true" />
                <span className="hb-peek-sr">Close</span>
              </DialogPrimitive.Close>
            </div>

            <figure className="hb-peek-shot">
              <img
                src={JOURNEY_IMG}
                width={1536}
                height={1024}
                decoding="async"
                alt="Illustrative Vendibook order: a food truck delivery map, arrival estimate and progress from payment through walkthrough, signatures and receipt confirmation."
              />
            </figure>

            <ul className="hb-peek-steps">
              {PEEK_STEPS.map((step) => (
                <li key={step.title} className="hb-peek-step">
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ul>

            <p className="hb-peek-note">
              Illustrative order. Tracking availability depends on the fulfillment method, driver consent and
              connection.
            </p>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

export default PostPurchasePeek;
