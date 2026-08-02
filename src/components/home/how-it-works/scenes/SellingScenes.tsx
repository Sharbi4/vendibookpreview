import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import {
  SceneShell,
  ListingCardMini,
  BadgeStamp,
  DashboardMock,
  InboxRow,
  ListingWizardStrip,
  PaymentOptionsPanel,
  Confetti,
} from './primitives';

/**
 * Selling on Vendibook — 8 scenes. Shows scattered social posts vs a
 * Vendibook listing, the listing wizard, publishing for free, the seller
 * dashboard, payment options for eligible buyers (PayPal / Affirm / pay in
 * person), sale tracking with payment status and payout timing, and the
 * handoff confirmations for both sides.
 */
export const sellingScenes = [
  // 1. Sell to the right audience
  () => (
    <SceneShell caption="List where food-business buyers are searching.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.25, scale: 0.9 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col gap-1"
        >
          {['General FB group', 'Craigslist', 'Text chain'].map((t, i) => (
            <div key={i} className="rounded-md border border-dashed border-muted-foreground/40 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground">
              {t}
            </div>
          ))}
        </motion.div>
        <Vendi accessory="camera" size={180} />
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}>
          <ListingCardMini variant="primary" label="On Vendibook" large />
        </motion.div>
      </div>
    </SceneShell>
  ),

  // 2. Create the listing (wizard) — aligned to real PublishWizard steps
  () => (
    <SceneShell caption="Build a professional listing step by step.">
      <div className="flex h-full w-full items-center justify-center px-4">
        <ListingWizardStrip steps={['Photos', 'Headline', 'Includes', 'Pricing', 'Location', 'Docs', 'PayPal', 'Review']} />
      </div>
    </SceneShell>
  ),


  // 3. Publish for free
  () => (
    <SceneShell caption="Always free to list.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <ListingCardMini variant="primary" label="Live" large />
        </motion.div>
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg"
        >
          Published — $0 listing fee
        </motion.div>
      </div>
    </SceneShell>
  ),

  // 4. Manage buyers & messages
  () => (
    <SceneShell caption="Your listing and buyer activity in one place.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <ListingCardMini variant="primary" label="Your listing" large />
        <div className="flex w-64 flex-col gap-1.5">
          <InboxRow from="Maya R." preview="Is the generator included?" unread delay={0.15} />
          <InboxRow from="David C." preview="Can I schedule an inspection?" unread delay={0.3} />
          <InboxRow from="Sofia L." preview="Delivery to Phoenix possible?" delay={0.45} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"
          >
            142 views · 8 saves · 3 inquiries
          </motion.div>
        </div>
      </div>
    </SceneShell>
  ),

  // 5. Payment options for buyers
  () => (
    <SceneShell caption="More ways for eligible buyers to complete the purchase.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <PaymentOptionsPanel price="$34,000" fees="Buyer's fee shown at checkout" />
        <div className="max-w-[200px] rounded-xl border border-dashed border-muted-foreground/40 bg-background/70 p-3 text-[10px] leading-relaxed text-muted-foreground">
          <div className="font-bold text-foreground">Disclosure</div>
          Affirm is subject to eligibility and approval. Vendibook and PayPal are not lenders. Sellers can also enable pay-in-person.
        </div>
      </div>
    </SceneShell>
  ),

  // 6. Track the sale (online) — PayPal payout hold shown explicitly
  () => (
    <SceneShell caption="Follow the sale from purchase to completion.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <DashboardMock
          role="Seller"
          title="Sale · 2018 Ford E-450"
          subtitle="Buyer: Maya R. · Paid via PayPal"
          statuses={[
            { label: 'Payment Completed', intent: 'success' },
            { label: 'Payout Scheduled · releases 25 days after buyer confirms', intent: 'info' },
          ]}
          timeline={[
            { label: 'Purchase created', state: 'done' },
            { label: 'Payment', state: 'done' },
            { label: 'Agreement', state: 'done' },
            { label: 'Handoff', state: 'active' },
            { label: 'Funds Released', state: 'pending' },
          ]}
          nextAction={{ label: 'Confirm the handoff at pickup', cta: 'Confirm' }}
          footer={
            <div className="text-[11px]">
              <span className="font-semibold">Payout timing:</span> released 25 days after the buyer confirms receipt (standard payment protection hold).
            </div>
          }
        />
      </div>
    </SceneShell>
  ),


  // 7. Pay-in-person cash sale — 100% free (no commission, no buyer fee)
  () => (
    <SceneShell caption="Pay-in-person cash sales are 100% free on Vendibook.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <DashboardMock
          role="Seller"
          title="Sale · Concession trailer"
          subtitle="Buyer: David C. · Cash at handoff · 0% commission"
          statuses={[
            { label: 'Payment due in person', intent: 'warning' },
            { label: 'Handoff scheduled', intent: 'info' },
          ]}
          timeline={[
            { label: 'Agreement', state: 'done' },
            { label: 'Handoff scheduled', state: 'done' },
            { label: 'Buyer receives', state: 'active' },
            { label: 'Seller confirms payment', state: 'pending' },
            { label: 'Complete', state: 'pending' },
          ]}
          nextAction={{ label: 'Confirm cash payment received at handoff', cta: 'Confirm' }}
        />
      </div>
    </SceneShell>
  ),


  // 8. Confirm the handoff — closing beat
  () => (
    <SceneShell caption="List for free. Sell with a better process.">
      <div className="relative flex h-full w-full items-end justify-center gap-6">
        <Confetti />
        <Vendi accessory="none" size={220} />
        <div className="flex flex-col items-center gap-2">
          <BadgeStamp label="Handoff Confirmed" />
          <BadgeStamp label="Transaction Completed" />
        </div>
      </div>
    </SceneShell>
  ),
];
