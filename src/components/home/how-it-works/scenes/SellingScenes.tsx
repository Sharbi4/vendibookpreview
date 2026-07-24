import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import { SceneShell, ListingCardMini, BadgeStamp, CheckDoc, MessageBubble } from './primitives';

export const sellingScenes = [
  () => (
    <SceneShell caption="Turn your equipment into your next opportunity.">
      <div className="flex h-full w-full items-center justify-center">
        <Vendi accessory="camera" size={220} />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Create your listing in a few simple steps.">
      <div className="flex h-full w-full items-center justify-center gap-4">
        {['Photos', 'Details', 'Price', 'Preview'].map((label, i) => (
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
    <SceneShell caption="Reach buyers actively searching for equipment.">
      <div className="flex h-full w-full items-center justify-center gap-4">
        <ListingCardMini variant="primary" label="Your listing" large />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + 0.2 * i }}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground">New view</span>
            </motion.div>
          ))}
        </div>
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Answer questions and schedule inspections.">
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8">
        <MessageBubble side="left" text="Can I come see it Saturday?" delay={0.2} />
        <MessageBubble side="right" text="Absolutely — 10am at the shop." delay={1} />
        <MessageBubble side="left" text="Great, see you then." delay={1.8} />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Review the agreement and complete the sale.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <CheckDoc label="Bill of Sale" />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}>
          <BadgeStamp label="Sold" />
        </motion.div>
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="List for free. Reach serious buyers. Sell smarter.">
      <div className="flex h-full w-full items-end justify-center">
        <Vendi accessory="none" size={240} />
      </div>
    </SceneShell>
  ),
];
