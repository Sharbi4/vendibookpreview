import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import { SceneShell, ListingCardMini, CheckDoc, PayoutCounter, PinDrop, MessageBubble } from './primitives';

export const hostingScenes = [
  () => (
    <SceneShell caption="Your unused availability could become income.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <Vendi accessory="dashboard" size={180} />
        <div className="flex flex-col gap-2">
          {['Trailer', 'Kitchen', 'Vendor lot'].map((t, i) => (
            <motion.div
              key={t}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 * i }}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
            >
              {t}
            </motion.div>
          ))}
        </div>
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Create a host listing with photos, pricing, and rules.">
      <div className="flex h-full w-full items-center justify-center gap-4">
        {['Photos', 'Rates', 'Amenities', 'Docs'].map((label, i) => (
          <motion.div
            key={label}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 * i }}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </div>
            <div className="text-xs font-semibold text-foreground">{label}</div>
          </motion.div>
        ))}
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Qualified renters discover your listing.">
      <div className="flex h-full w-full items-center justify-center gap-4">
        <ListingCardMini variant="primary" label="Your space" large />
        <PinDrop delay={0.4} />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Review renter profile, dates, and documents.">
      <div className="flex h-full w-full items-center justify-center gap-4">
        <CheckDoc label="Renter Profile" />
        <CheckDoc label="Dates" />
        <CheckDoc label="Documents" />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Manage bookings and communicate from one dashboard.">
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8">
        <MessageBubble side="right" text="Booking approved — see you at 8am." delay={0.2} />
        <MessageBubble side="left" text="Thanks! We're all set." delay={1} />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Make your equipment or space work harder for you.">
      <div className="flex h-full w-full items-center justify-center">
        <PayoutCounter target={1240} />
      </div>
    </SceneShell>
  ),
];
