import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Check, FileText, MapPin } from 'lucide-react';

/** Full-bleed scene container with caption bar. */
export const SceneShell = ({ children, caption }: { children: ReactNode; caption: string }) => (
  <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-muted/40 via-background to-muted/20">
    <div className="absolute inset-0">{children}</div>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background/95 via-background/70 to-transparent px-4 pb-5 pt-16 sm:px-8 sm:pb-7">
      <motion.p
        key={caption}
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-2xl text-center text-base font-semibold leading-snug text-foreground sm:text-lg"
      >
        {caption}
      </motion.p>
    </div>
  </div>
);

export const ListingCardMini = ({
  variant = 'neutral',
  label,
  large = false,
}: {
  variant?: 'neutral' | 'primary';
  label?: string;
  large?: boolean;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl border-2 ${
      variant === 'primary' ? 'border-primary/60' : 'border-border'
    } bg-card shadow-md ${large ? 'h-40 w-56' : 'h-32 w-40'}`}
  >
    <div className="h-2/3 w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
    <div className="flex items-center justify-between px-3 py-2">
      <div className="h-2 w-14 rounded-full bg-foreground/30" />
      {label && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            variant === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  </div>
);

export const BadgeStamp = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-primary shadow-lg">
    <Check className="h-5 w-5" strokeWidth={3} />
    <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
  </div>
);

export const CheckDoc = ({ label }: { label: string }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="flex h-40 w-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-border bg-card p-3 shadow-md"
  >
    <FileText className="h-8 w-8 text-foreground/70" />
    <div className="text-center text-xs font-semibold text-foreground">{label}</div>
    <div className="mt-1 h-1 w-16 rounded-full bg-muted" />
    <div className="h-1 w-14 rounded-full bg-muted" />
    <div className="h-1 w-16 rounded-full bg-muted" />
  </motion.div>
);

export const MessageBubble = ({
  side,
  text,
  delay = 0,
}: {
  side: 'left' | 'right';
  text: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ x: side === 'left' ? -30 : 30, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay, type: 'spring', stiffness: 200, damping: 22 }}
    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:text-base ${
      side === 'left'
        ? 'self-start rounded-bl-sm bg-card text-foreground border border-border'
        : 'self-end rounded-br-sm bg-primary text-primary-foreground'
    }`}
    style={{ alignSelf: side === 'left' ? 'flex-start' : 'flex-end' }}
  >
    {text}
  </motion.div>
);

export const MapDots = () => (
  <svg viewBox="0 0 400 260" className="absolute inset-0 h-full w-full opacity-30">
    <defs>
      <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
        <path d="M 26 0 L 0 0 0 26" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="400" height="260" fill="url(#grid)" />
    {[
      [60, 80], [140, 60], [220, 100], [300, 70], [340, 160], [80, 180], [180, 200], [260, 180],
    ].map(([x, y], i) => (
      <motion.circle
        key={i}
        cx={x}
        cy={y}
        r="5"
        fill="hsl(var(--primary))"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.4, 1] }}
        transition={{ delay: i * 0.12, duration: 0.5 }}
      />
    ))}
  </svg>
);

export const CalendarGrid = ({ selected = [12, 13, 14, 15] }: { selected?: number[] }) => (
  <div className="grid w-72 grid-cols-7 gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-md">
    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
      <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground">
        {d}
      </div>
    ))}
    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
      <motion.div
        key={day}
        initial={{ scale: 1 }}
        animate={selected.includes(day) ? { scale: [1, 1.15, 1], backgroundColor: 'hsl(var(--primary))' } : {}}
        transition={{ delay: selected.indexOf(day) * 0.15, duration: 0.4 }}
        className={`flex aspect-square items-center justify-center rounded-md text-xs font-medium ${
          selected.includes(day) ? 'text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {day}
      </motion.div>
    ))}
  </div>
);

export const PinDrop = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ y: -30, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, type: 'spring', stiffness: 180, damping: 14 }}
  >
    <MapPin className="h-8 w-8 text-primary" fill="hsl(var(--primary))" strokeWidth={1.5} />
  </motion.div>
);

export const PayoutCounter = ({ target = 1240 }: { target?: number }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-lg"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payout received</div>
      <motion.div
        className="mt-1 text-3xl font-bold text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        ${target.toLocaleString()}
      </motion.div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
};
