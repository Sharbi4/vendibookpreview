import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import {
  SceneShell,
  ListingCardMini,
  MessageBubble,
  MapDots,
  PaymentOptionsPanel,
  DashboardMock,
  BadgeStamp,
  Confetti,
} from './primitives';

/**
 * Buying on Vendibook — 8 scenes, ~10s each. Shows scattered posts becoming
 * an organized marketplace, listing detail, messaging, payment options
 * (PayPal / financing eligibility / pay-in-person), the buyer purchase
 * dashboard, a pay-in-person workflow, and handoff confirmations.
 */
export const buyingScenes = [
  // 1. A better way to search
  () => (
    <SceneShell caption="A marketplace built for food-business equipment.">
      <div className="relative flex h-full w-full items-center justify-center">
        <MapDots />
        <div className="relative z-10 flex items-center gap-6">
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0.2, scale: 0.9 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-col gap-1"
          >
            {['Social post', 'DM chain', 'PDF flyer'].map((t, i) => (
              <div key={i} className="rounded-md border border-dashed border-muted-foreground/40 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground">
                {t}
              </div>
            ))}
          </motion.div>
          <Vendi accessory="search" size={180} />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <ListingCardMini variant="primary" label="Live" large />
          </motion.div>
        </div>
      </div>
    </SceneShell>
  ),

  // 2. Search & compare
  () => (
    <SceneShell caption="Search. Compare. Save your favorites.">
      <div className="relative flex h-full w-full items-center justify-center gap-4 px-6">
        <div className="flex flex-col gap-1.5">
          {['Food truck', 'Trailer', 'Under $50k', 'Delivery ok'].map((f, i) => (
            <motion.div
              key={f}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 * i }}
              className="rounded-full border border-primary/40 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary"
            >
              {f}
            </motion.div>
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 + 0.15 * i, type: 'spring', stiffness: 180, damping: 22 }}
          >
            <ListingCardMini variant={i === 1 ? 'primary' : 'neutral'} label={['$34k', '$52k', '$41k'][i]} />
          </motion.div>
        ))}
      </div>
    </SceneShell>
  ),

  // 3. Review the details
  () => (
    <SceneShell caption="More information before you commit.">
      <div className="relative flex h-full w-full items-center justify-center gap-6 px-6">
        <ListingCardMini variant="primary" label="Featured" large />
        <div className="flex flex-col gap-1.5">
          {[
            'Photos & specs',
            'Included equipment',
            'Seller profile',
            'Available documents',
            'Verified indicators',
            'Accepted payments',
          ].map((t, i) => (
            <motion.div
              key={t}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.12 * i }}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
            >
              {t}
            </motion.div>
          ))}
        </div>
      </div>
    </SceneShell>
  ),

  // 4. Message the seller
  () => (
    <SceneShell caption="Listing details and conversations together.">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8">
        <MessageBubble side="left" text="Is the generator included?" delay={0.1} />
        <MessageBubble side="right" text="Yes — 8kW inverter, serviced last spring." delay={0.7} />
        <MessageBubble side="left" text="Can I schedule an inspection this Saturday?" delay={1.3} />
        <MessageBubble side="right" text="Absolutely. I'll share maintenance records too." delay={1.9} />
      </div>
    </SceneShell>
  ),

  // 5. Review payment options (PayPal / financing / Pay in person)
  () => (
    <SceneShell caption="Review your total, then pick an available payment method.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <PaymentOptionsPanel price="$34,000" fees="+ platform fee" />
        <div className="max-w-[200px] rounded-xl border border-dashed border-muted-foreground/40 bg-background/70 p-3 text-[10px] leading-relaxed text-muted-foreground">
          <div className="font-bold text-foreground">Disclosure</div>
          PayPal processes online payments. Equipment financing is offered by a third-party lender and is subject to approval. Payment options vary by listing.
        </div>
      </div>
    </SceneShell>
  ),

  // 6. Purchase dashboard with next-action prompt
  () => (
    <SceneShell caption="Know what's complete and what's next.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <DashboardMock
          role="Shopper"
          title="2018 Ford E-450 Food Truck"
          subtitle="Seller: Maria's Kitchen • $34,000"
          statuses={[
            { label: 'Payment Completed', intent: 'success' },
            { label: 'Agreement Ready', intent: 'info' },
          ]}
          timeline={[
            { label: 'Purchase created', state: 'done' },
            { label: 'Payment', state: 'done' },
            { label: 'Agreement', state: 'active' },
            { label: 'Handoff', state: 'pending' },
            { label: 'Complete', state: 'pending' },
          ]}
          nextAction={{ label: 'Review and sign the purchase agreement', cta: 'Review' }}
        />
      </div>
    </SceneShell>
  ),

  // 7. Pay-in-person workflow
  () => (
    <SceneShell caption="Even offline payments stay organized.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <DashboardMock
          role="Shopper"
          title="Pay-in-person purchase"
          subtitle="Handoff scheduled Sat 10:00 AM"
          statuses={[
            { label: 'Payment due in person', intent: 'warning' },
            { label: 'Handoff scheduled', intent: 'info' },
          ]}
          timeline={[
            { label: 'Agreement signed', state: 'done' },
            { label: 'Handoff scheduled', state: 'done' },
            { label: 'Buyer confirms receipt', state: 'active' },
            { label: 'Seller confirms payment', state: 'pending' },
            { label: 'Complete', state: 'pending' },
          ]}
          nextAction={{ label: 'Confirm receipt at handoff', cta: 'Confirm' }}
        />
      </div>
    </SceneShell>
  ),


  // 8. Complete the handoff
  () => (
    <SceneShell caption="Find it. Finance it when eligible. Manage the purchase.">
      <div className="relative flex h-full w-full items-end justify-center gap-6">
        <Confetti />
        <Vendi accessory="none" size={220} />
        <div className="flex flex-col items-center gap-3">
          <BadgeStamp label="Receipt Confirmed" />
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-md"
          >
            Transaction Completed · Leave a review
          </motion.div>
        </div>
      </div>
    </SceneShell>
  ),
];
