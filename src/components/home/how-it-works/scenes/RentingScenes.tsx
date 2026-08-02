import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import {
  SceneShell,
  ListingCardMini,
  BadgeStamp,
  CalendarGrid,
  CheckDoc,
  DashboardMock,
  PaymentOptionsPanel,
  Confetti,
} from './primitives';

/**
 * Renting on Vendibook — 8 scenes. Shows browsing rentals, the booking
 * calendar with available / booked / selected states, the request flow,
 * host approval, verification & documents, PayPal checkout, the renter
 * dashboard, and pickup / return confirmations.
 */
export const rentingScenes = [
  // 1. Rent before you buy
  () => (
    <SceneShell caption="Rent the equipment you need.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <Vendi accessory="calendar" size={200} />
        <div className="flex flex-col gap-2 text-xs font-semibold text-foreground">
          <div className="rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">Test a food concept</div>
          <div className="rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">Catering event</div>
          <div className="rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">Weekend pop-up</div>
        </div>
      </div>
    </SceneShell>
  ),

  // 2. Find a rental
  () => (
    <SceneShell caption="Find a rental that fits your business.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 * i, type: 'spring', stiffness: 180, damping: 22 }}
          >
            <ListingCardMini
              variant={i === 1 ? 'primary' : 'neutral'}
              label={['$180/day', '$220/day', '$150/day'][i]}
            />
          </motion.div>
        ))}
      </div>
    </SceneShell>
  ),

  // 3. Booking calendar
  () => (
    <SceneShell caption="Choose your dates and see your total.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <CalendarGrid title="Availability" selected={[12, 13, 14, 15]} booked={[4, 5, 20, 21]} />
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-56 rounded-xl border border-border bg-card p-3 text-xs shadow-md"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cost breakdown</div>
          <div className="mt-1.5 flex justify-between"><span>4 days × $180</span><span className="font-semibold">$720</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Platform fee</span><span>+ shown at checkout</span></div>
          <div className="mt-1.5 flex justify-between border-t border-border pt-1.5"><span className="font-bold">Total</span><span className="font-bold">$—</span></div>
        </motion.div>
      </div>
    </SceneShell>
  ),

  // 4. Send the request
  () => (
    <SceneShell caption="One organized booking request.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-80 rounded-2xl border border-border bg-card p-4 shadow-xl"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rental request</div>
          <div className="mt-2 space-y-1.5 text-xs">
            {[
              ['Dates', 'Sep 12 – Sep 15'],
              ['Intended use', 'Weekend catering event'],
              ['Business', 'Marcus BBQ Co.'],
              ['Message', '"Pickup Fri morning ok?"'],
              ['Documents', 'ID, COI, permit'],
            ].map(([k, v], i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex justify-between border-b border-border/60 pb-1 last:border-0"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold text-foreground">{v}</span>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground"
          >
            Request Submitted · Awaiting Host Approval
          </motion.div>

        </motion.div>
      </div>
    </SceneShell>
  ),

  // 5. Host review & approval
  () => (
    <SceneShell caption="Approval updates the booking automatically.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <DashboardMock
          role="Host"
          title="New request · Marcus BBQ Co."
          subtitle="Sep 12 – Sep 15"
          statuses={[{ label: 'Request Submitted', intent: 'warning' }]}
          timeline={[
            { label: 'Request received', state: 'done' },
            { label: 'Review renter', state: 'active' },
            { label: 'Approve', state: 'pending' },
          ]}
          nextAction={{ label: 'Action needed: approve or decline', cta: 'Approve' }}
        />
      </div>
    </SceneShell>
  ),


  // 6. Verification, documents & agreement
  () => (
    <SceneShell caption="Complete your requirements in one place.">
      <div className="flex h-full w-full items-center justify-center gap-3">
        <CheckDoc label="ID Verification" />
        <CheckDoc label="Insurance (COI)" />
        <CheckDoc label="Business Info" />
        <CheckDoc label="Rental Agreement" />
      </div>
    </SceneShell>
  ),

  // 7. PayPal payment + shopper dashboard (rental view)
  () => (
    <SceneShell caption="Payment and booking status together.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <PaymentOptionsPanel price="$720" fees="+ platform fee" showAffirm={false} showPayInPerson={false} />
        <DashboardMock
          role="Shopper"
          title="Sprinter kitchen · Sep 12–15"
          subtitle="Host: Andre"
          statuses={[
            { label: 'Payment Completed · Booking Confirmed', intent: 'success' },
          ]}
          timeline={[
            { label: 'Payment', state: 'done' },
            { label: 'Documents', state: 'done' },
            { label: 'Pickup', state: 'active' },
            { label: 'Return', state: 'pending' },
          ]}
          nextAction={{ label: 'Pickup Friday 8:00 AM — instructions in messages', cta: 'View' }}
        />
      </div>
    </SceneShell>
  ),


  // 8. Pickup & return
  () => (
    <SceneShell caption="Book it. Manage it. Put it to work.">
      <div className="relative flex h-full w-full items-end justify-center gap-6">
        <Confetti />
        <Vendi accessory="none" size={220} />
        <div className="flex flex-col items-center gap-2">
          <BadgeStamp label="Pickup Confirmed" />
          <BadgeStamp label="Return Confirmed" />
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-md"
          >
            Booking Completed · Review your host
          </motion.div>
        </div>
      </div>
    </SceneShell>
  ),
];
