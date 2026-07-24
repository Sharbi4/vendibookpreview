import { motion } from 'framer-motion';
import { Vendi } from '../Vendi';
import { SceneShell, ListingCardMini, BadgeStamp, CalendarGrid, CheckDoc, MessageBubble, PinDrop } from './primitives';

export const rentingScenes = [
  () => (
    <SceneShell caption="Start sooner without buying upfront.">
      <div className="flex h-full w-full items-center justify-center">
        <Vendi accessory="calendar" size={220} />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Browse rentals by location, dates, and equipment.">
      <div className="flex h-full w-full items-center justify-center gap-4 px-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 * i, type: 'spring', stiffness: 180, damping: 22 }}
          >
            <ListingCardMini variant={i === 1 ? 'primary' : 'neutral'} label={['$180/day', '$220/day', '$150/day'][i]} />
          </motion.div>
        ))}
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Pick your dates and send a request.">
      <div className="flex h-full w-full items-center justify-center gap-6">
        <CalendarGrid selected={[12, 13, 14, 15]} />
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg"
        >
          Request sent ✓
        </motion.div>
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Clear steps. Organized documentation.">
      <div className="flex h-full w-full items-center justify-center gap-4">
        <CheckDoc label="ID Verified" />
        <CheckDoc label="Insurance" />
        <CheckDoc label="Rental Agreement" />
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Coordinate pickup or delivery through Vendibook.">
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8">
        <MessageBubble side="left" text="Pickup at 8am works — I'll bring the keys." delay={0.2} />
        <MessageBubble side="right" text="Perfect. See you then!" delay={1} />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7, type: 'spring' }}>
          <BadgeStamp label="Handoff confirmed" />
        </motion.div>
      </div>
    </SceneShell>
  ),
  () => (
    <SceneShell caption="Rent the equipment. Test your concept. Grow from there.">
      <div className="relative flex h-full w-full items-end justify-center">
        <Vendi accessory="none" size={240} />
        <PinDrop delay={0.3} />
      </div>
    </SceneShell>
  ),
];
