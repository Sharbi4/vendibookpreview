import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import {
  SceneShell,
  ListingCardMini,
  BadgeStamp,
  CalendarGrid,
  DashboardMock,
  PayoutTimeline,
  ListingWizardStrip,
} from './primitives';

/**
 * Hosting on Vendibook — 8 scenes. Shows unused availability becoming
 * income, the host listing wizard, the host calendar with available /
 * booked states, incoming booking requests, the host dashboard, Stripe
 * payment tracking, the actual payout timing (24h after rental ends), and
 * handoff / return / review beats.
 */
export const hostingScenes = [
  // 1. Turn availability into income
  () => (
    <SceneShell caption="Make available equipment and space work harder.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <Vendi accessory="dashboard" size={200} />
        <div className="flex flex-col gap-2">
          {['Food trailer — 3 open days/wk', 'Commercial kitchen — nights', 'Vendor lot — Sat/Sun'].map((t, i) => (
            <motion.div
              key={t}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 * i }}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm"
            >
              {t}
            </motion.div>
          ))}
        </div>
      </div>
    </SceneShell>
  ),

  // 2. Create the host listing
  () => (
    <SceneShell caption="Set expectations before the request arrives.">
      <div className="flex h-full w-full items-center justify-center px-4">
        <ListingWizardStrip steps={['Photos', 'Price', 'Amenities', 'Rules', 'Docs', 'Access']} />
      </div>
    </SceneShell>
  ),

  // 3. Control the calendar
  () => (
    <SceneShell caption="You control when your listing is available.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <CalendarGrid title="Your calendar" selected={[9, 10, 11]} booked={[4, 5, 6, 17, 18, 24, 25]} />
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="rounded-md bg-primary/10 px-2.5 py-1.5 font-semibold text-primary">Booked · Sep 4–6</div>
          <div className="rounded-md bg-muted px-2.5 py-1.5 font-semibold text-foreground">Blocked · Sep 17–18</div>
          <div className="rounded-md border border-primary/50 bg-background px-2.5 py-1.5 font-semibold text-foreground">Pending request · Sep 9–11</div>
        </div>
      </div>
    </SceneShell>
  ),

  // 4. Review booking requests
  () => (
    <SceneShell caption="Review the details before you approve.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <DashboardMock
          role="Host"
          title="Request · Marcus BBQ Co."
          subtitle="Sep 9 – Sep 11 · $540"
          statuses={[
            { label: 'New Request', intent: 'warning' },
            { label: 'Verification pending', intent: 'info' },
          ]}
          timeline={[
            { label: 'Request received', state: 'done' },
            { label: 'Review renter', state: 'active' },
            { label: 'Approve or decline', state: 'pending' },
          ]}
          nextAction={{ label: 'Action needed: approve or decline this request', cta: 'Open' }}
        />
      </div>
    </SceneShell>
  ),


  // 5. Manage the booking dashboard
  () => (
    <SceneShell caption="One dashboard for your hosting activity.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <DashboardMock
          role="Host"
          title="Confirmed booking · Sprinter kitchen"
          subtitle="Renter: Marcus · Sep 9–11"
          statuses={[
            { label: 'Payment Secured · Booking Confirmed', intent: 'success' },
          ]}
          timeline={[
            { label: 'Approved', state: 'done' },
            { label: 'Payment', state: 'done' },
            { label: 'Pickup', state: 'active' },
            { label: 'Return', state: 'pending' },
            { label: 'Payout', state: 'pending' },
          ]}
          nextAction={{ label: 'Send pickup instructions to renter', cta: 'Send' }}
        />
      </div>
    </SceneShell>
  ),


  // 6. Stripe payment flow
  () => (
    <SceneShell caption="See payment and payout status clearly.">
      <div className="flex h-full w-full items-center justify-center px-6">
        <PayoutTimeline />
      </div>
    </SceneShell>
  ),

  // 7. Host pricing & payout timing — real 12.9% host commission from commissions.ts
  () => (
    <SceneShell caption="You set your price. Vendibook shows exactly how the payout breaks down.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-72 rounded-2xl border border-border bg-card p-4 shadow-xl"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Host earnings</div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Your rental price</span><span className="font-semibold text-foreground">$500.00</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Host commission (12.9%)</span><span className="text-muted-foreground">− $64.50</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1.5"><span className="font-bold text-foreground">Your payout</span><span className="font-bold text-primary">$435.50</span></div>
            <div className="pt-1 text-[10px] text-muted-foreground">Renter's 12.9% platform fee shown at their checkout.</div>
          </div>
          <div className="mt-3 rounded-lg border border-primary/40 bg-primary/8 px-3 py-2 text-[11px] font-semibold text-foreground">
            Payout scheduled 24 hours after the rental ends.
          </div>
        </motion.div>
        <ListingCardMini variant="primary" label="$500 / rental" large />
      </div>
    </SceneShell>
  ),


  // 8. Handoff, return & review
  () => (
    <SceneShell caption="You provide the opportunity. Vendibook organizes the process.">
      <div className="flex h-full w-full items-end justify-center gap-6">
        <Vendi accessory="none" size={220} />
        <div className="flex flex-col items-center gap-2">
          <BadgeStamp label="Pickup Confirmed" />
          <BadgeStamp label="Return Confirmed" />
          <BadgeStamp label="Payout Scheduled" />
        </div>
      </div>
    </SceneShell>
  ),
];
