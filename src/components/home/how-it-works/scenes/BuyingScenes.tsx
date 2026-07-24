import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import { SceneShell, ListingCardMini, BadgeStamp, MessageBubble, CheckDoc, MapDots } from './primitives';

/** 6 scenes for the Buying explainer. Each is ~10s. */
export const buyingScenes = [
  // Scene 1 — The Search
  () => (
    <SceneShell caption="Your food business starts with the right equipment.">
      <div className="relative flex h-full w-full items-center justify-center">
        <MapDots />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Vendi accessory="search" size={220} />
        </motion.div>
      </div>
    </SceneShell>
  ),
  // Scene 2 — Browse Listings
  () => (
    <SceneShell caption="Search. Compare. Find the right fit.">
      <div className="relative flex h-full w-full items-center justify-center gap-4 px-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 * i, type: 'spring', stiffness: 180, damping: 22 }}
          >
            <ListingCardMini variant={i === 1 ? 'primary' : 'neutral'} label={['$34k', '$52k', '$41k'][i]} />
          </motion.div>
        ))}
      </div>
    </SceneShell>
  ),
  // Scene 3 — Review the Details
  () => (
    <SceneShell caption="Photos, specs, seller info — all in one place.">
      <div className="relative flex h-full w-full items-center justify-center gap-6 px-6">
        <ListingCardMini variant="primary" label="Featured" large />
        <div className="flex flex-col gap-2">
          {['Equipment', 'Documents', 'Verified'].map((t, i) => (
            <motion.div
              key={t}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 * i }}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm"
            >
              {t}
            </motion.div>
          ))}
        </div>
      </div>
    </SceneShell>
  ),
  // Scene 4 — Connect With the Seller
  () => (
    <SceneShell caption="Connect directly and make an informed decision.">
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8">
        <MessageBubble side="left" text="Is the fryer still under warranty?" delay={0.1} />
        <MessageBubble side="right" text="Yes — through 2027. Happy to share paperwork." delay={0.9} />
        <MessageBubble side="left" text="Can I schedule an inspection?" delay={1.7} />
      </div>
    </SceneShell>
  ),
  // Scene 5 — Complete the Purchase
  () => (
    <SceneShell caption="Sign documents and choose a payment option.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <CheckDoc label="Purchase Agreement" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 12 }}
        >
          <BadgeStamp label="Signed" />
        </motion.div>
      </div>
    </SceneShell>
  ),
  // Scene 6 — Start the Business
  () => (
    <SceneShell caption="Find the equipment. Build the business.">
      <div className="relative flex h-full w-full items-end justify-center">
        <Vendi accessory="none" size={260} />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute right-8 top-8 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg"
        >
          Open for business
        </motion.div>
      </div>
    </SceneShell>
  ),
];
