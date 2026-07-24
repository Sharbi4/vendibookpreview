import { motion } from 'framer-motion';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  MapPin,
  CreditCard,
  Banknote,
  Clock,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Calendar as CalendarIcon,
} from 'lucide-react';

/**
 * Safe design canvas: every scene composes at a fixed 960×540 (16:9) so the
 * scenes look identical on desktop, tablet, and mobile — we uniformly
 * `transform: scale()` the whole canvas to fit the actual stage. This is
 * what keeps Vendi + dashboards + side-by-side layouts fully visible on a
 * ~384px phone viewport instead of getting clipped.
 */
const CANVAS_W = 960;
const CANVAS_H = 540;

/**
 * MobileRenderContext — set by SceneShell when the actual stage width
 * (post-scale, in real CSS pixels) is narrow enough that avatars and dense
 * dashboards would visually disappear. Consumers (Vendi in particular) opt
 * into simplified layout and elevated z-index rules when this is true.
 */
type MobileRenderInfo = { isMobile: boolean; stageWidth: number };
const MobileRenderContext = createContext<MobileRenderInfo>({ isMobile: false, stageWidth: CANVAS_W });
export const useMobileRender = () => useContext(MobileRenderContext);

/** Full-bleed scene container with caption bar. */
export const SceneShell = ({ children, caption }: { children: ReactNode; caption: string }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [stageWidth, setStageWidth] = useState(CANVAS_W);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      // Contain: uniform scale so nothing gets clipped or squished.
      setScale(Math.min(width / CANVAS_W, height / CANVAS_H));
      setStageWidth(width);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Treat stages narrower than ~520 CSS px as "mobile render mode" — this
  // covers phones (portrait & landscape) plus the modal on small tablets.
  const isMobile = stageWidth < 520;

  return (
    <MobileRenderContext.Provider value={{ isMobile, stageWidth }}>
      <div
        ref={wrapRef}
        className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,hsl(var(--background))_0%,hsl(var(--muted)/0.35)_55%,hsl(var(--background))_100%)]"
      >
        {/* Layered depth: brand-tinted radial glows + subtle grid + vignette.
            Gives every scene a cinematic backdrop instead of flat gradient. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: [
              'radial-gradient(60% 45% at 18% 22%, hsl(var(--primary) / 0.18), transparent 70%)',
              'radial-gradient(50% 40% at 82% 78%, hsl(var(--primary) / 0.12), transparent 72%)',
              'radial-gradient(40% 35% at 50% 110%, hsl(var(--foreground) / 0.10), transparent 70%)',
            ].join(','),
          }}
        />
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.06] mix-blend-overlay"
        >
          <defs>
            <pattern id="scene-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#scene-grid)" />
        </svg>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ boxShadow: 'inset 0 0 160px 20px hsl(var(--background) / 0.9)' }}
        />
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Scene content sits above the caption gradient so mascots and
              dashboards are never hidden behind it on small screens. */}
          <div className="relative z-30 h-full w-full">{children}</div>
          <div
            className={
              // On mobile the caption block is compressed so it never eats
              // into the mascot's lower half; on desktop we keep the tall
              // cinematic fade-up.
              'pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background/95 via-background/60 to-transparent px-8 ' +
              (isMobile ? 'pb-4 pt-6' : 'pb-7 pt-16')
            }
          >
            <motion.p
              key={caption}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-2xl text-center text-lg font-semibold leading-snug text-foreground drop-shadow-sm"
            >
              {caption}
            </motion.p>
          </div>
        </div>
      </div>
    </MobileRenderContext.Provider>
  );
};





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

/**
 * Booking calendar with clearly distinct available / booked-out / selected day
 * states — reused across renting and hosting scenes.
 */
export const CalendarGrid = ({
  selected = [12, 13, 14, 15],
  booked = [4, 5, 20, 21],
  title,
}: {
  selected?: number[];
  booked?: number[];
  title?: string;
}) => (
  <div className="w-72 rounded-2xl border border-border bg-card p-4 shadow-md">
    {title && (
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
    )}
    <div className="grid grid-cols-7 gap-1.5">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground">
          {d}
        </div>
      ))}
      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
        const isSelected = selected.includes(day);
        const isBooked = booked.includes(day);
        return (
          <motion.div
            key={day}
            initial={{ scale: 1 }}
            animate={
              isSelected
                ? { scale: [1, 1.15, 1], backgroundColor: 'hsl(var(--primary))' }
                : {}
            }
            transition={{ delay: selected.indexOf(day) * 0.12, duration: 0.4 }}
            className={`flex aspect-square items-center justify-center rounded-md text-xs font-medium ${
              isSelected
                ? 'text-primary-foreground'
                : isBooked
                  ? 'bg-muted-foreground/25 text-muted-foreground line-through'
                  : 'bg-muted text-foreground'
            }`}
          >
            {day}
          </motion.div>
        );
      })}
    </div>
    <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted" /> Available
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-primary" /> Selected
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Booked
      </span>
    </div>
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

/* ---------------------------------------------------------------------------
 * Product-accurate mocks: dashboards, payment options, timelines, payouts.
 * These reflect the actual Vendibook workflow — status labels, next-action
 * prompts, and payment tracking that users see inside the app.
 * ------------------------------------------------------------------------- */

type StatusState = 'done' | 'active' | 'pending';

const dot = (state: StatusState) =>
  state === 'done'
    ? 'bg-primary'
    : state === 'active'
      ? 'bg-primary ring-4 ring-primary/25 animate-pulse'
      : 'bg-muted-foreground/30';

/**
 * TransactionTimeline: horizontal step tracker with status dots and labels.
 * Mirrors the buyer / seller / renter / host transaction views inside the app.
 */
export const TransactionTimeline = ({
  steps,
}: {
  steps: Array<{ label: string; state: StatusState }>;
}) => (
  <div className="flex w-full items-start justify-between gap-1.5">
    {steps.map((s, i) => (
      <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
        <div className="flex w-full items-center">
          <div className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : s.state === 'pending' ? 'bg-muted' : 'bg-primary'}`} />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 * i, type: 'spring', stiffness: 220, damping: 18 }}
            className={`h-3 w-3 rounded-full ${dot(s.state)}`}
          />
          <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'bg-transparent' : s.state === 'done' ? 'bg-primary' : 'bg-muted'}`} />
        </div>
        <span className={`text-[10px] font-medium leading-tight text-center ${s.state === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
          {s.label}
        </span>
      </div>
    ))}
  </div>
);

/**
 * StatusPill: one of the actual Vendibook status labels. Colored by intent.
 */
export const StatusPill = ({
  label,
  intent = 'info',
}: {
  label: string;
  intent?: 'info' | 'success' | 'warning' | 'neutral';
}) => {
  const cls = {
    info: 'bg-primary/12 text-primary border-primary/30',
    success: 'bg-primary/15 text-primary border-primary/40',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    neutral: 'bg-muted text-muted-foreground border-border',
  }[intent];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

/**
 * NextActionCard: the "what you need to do next" prompt that appears in the
 * app's booking and purchase dashboards.
 */
export const NextActionCard = ({
  label,
  cta,
}: {
  label: string;
  cta: string;
}) => (
  <motion.div
    key={label}
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.35 }}
    className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/8 px-3 py-2.5 shadow-sm"
  >
    <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary" />
    <div className="flex-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Next action</div>
      <div className="text-xs font-semibold text-foreground">{label}</div>
    </div>
    <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm">
      {cta}
    </span>
  </motion.div>
);

/**
 * DashboardMock: role-aware transaction dashboard card. Includes header,
 * status pills, transaction timeline, and a next-action prompt. Used as the
 * hero visual in most later scenes.
 */
export const DashboardMock = ({
  role,
  title,
  subtitle,
  statuses,
  timeline,
  nextAction,
  footer,
}: {
  role: 'Buyer' | 'Seller' | 'Renter' | 'Host' | 'Shopper';
  title: string;
  subtitle?: string;
  statuses: Array<{ label: string; intent?: 'info' | 'success' | 'warning' | 'neutral' }>;
  timeline: Array<{ label: string; state: StatusState }>;
  nextAction?: { label: string; cta: string };
  footer?: ReactNode;
}) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {role} dashboard
        </div>
        <div className="mt-0.5 text-sm font-bold leading-tight text-foreground">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="flex flex-wrap items-end justify-end gap-1">
        {statuses.map((s, i) => (
          <StatusPill key={i} label={s.label} intent={s.intent} />
        ))}
      </div>
    </div>

    <div className="mt-4">
      <TransactionTimeline steps={timeline} />
    </div>

    {nextAction && (
      <div className="mt-4">
        <NextActionCard label={nextAction.label} cta={nextAction.cta} />
      </div>
    )}

    {footer && <div className="mt-3 border-t border-border pt-3 text-xs text-foreground/80">{footer}</div>}
  </motion.div>
);

/**
 * PaymentOptionsPanel: shows the actual purchase summary and the payment
 * methods available on Vendibook — Stripe, Affirm (when eligible), and
 * pay-in-person (when offered by the seller/host).
 */
export const PaymentOptionsPanel = ({
  price,
  fees,
  showAffirm = true,
  showPayInPerson = true,
}: {
  price: string;
  fees: string;
  showAffirm?: boolean;
  showPayInPerson?: boolean;
}) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="w-80 rounded-2xl border border-border bg-card p-4 shadow-xl"
  >
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Transaction details
    </div>
    <div className="mt-2 space-y-1 text-xs">
      <div className="flex justify-between"><span className="text-muted-foreground">Listing price</span><span className="font-semibold text-foreground">{price}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="font-semibold text-foreground">{fees}</span></div>
      <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm"><span className="font-bold text-foreground">Total</span><span className="font-bold text-foreground">$—</span></div>
    </div>
    <div className="mt-3 space-y-1.5">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/8 px-2.5 py-2 text-xs"
      >
        <CreditCard className="h-4 w-4 text-primary" />
        <div className="flex-1 font-semibold text-foreground">Pay online (Stripe)</div>
        <span className="text-[10px] font-bold text-primary">Selected</span>
      </motion.div>
      {showAffirm && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs"
        >
          <ShieldCheck className="h-4 w-4 text-foreground/70" />
          <div className="flex-1">
            <div className="font-semibold text-foreground">Affirm — monthly payments</div>
            <div className="text-[10px] text-muted-foreground">Subject to eligibility &amp; approval</div>
          </div>
        </motion.div>
      )}
      {showPayInPerson && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs"
        >
          <Banknote className="h-4 w-4 text-foreground/70" />
          <div className="flex-1">
            <div className="font-semibold text-foreground">Pay in person</div>
            <div className="text-[10px] text-muted-foreground">When offered by the seller</div>
          </div>
        </motion.div>
      )}
    </div>
  </motion.div>
);

/**
 * PayoutTimeline: shows the actual Vendibook payout schedule for hosts —
 * paid on Stripe checkout, host payout released 24h after the rental ends.
 */
export const PayoutTimeline = () => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
  >
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Clock className="h-3.5 w-3.5 text-primary" /> Payout schedule
    </div>
    {[
      { label: 'Renter payment received (Stripe)', when: 'Booking confirmed', done: true },
      { label: 'Rental in progress', when: 'Pickup → return', done: true },
      { label: 'Return confirmed by both sides', when: 'End of rental', done: true },
      { label: 'Host payout released', when: '24 hours after rental ends', done: false, highlight: true },
    ].map((row, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 * i }}
        className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
          row.highlight ? 'border-primary bg-primary/8' : 'border-border bg-background'
        }`}
      >
        <div className={`flex h-4 w-4 items-center justify-center rounded-full ${row.done ? 'bg-primary text-primary-foreground' : 'border-2 border-primary'}`}>
          {row.done && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
        </div>
        <div className="flex-1 font-semibold text-foreground">{row.label}</div>
        <div className="text-[10px] text-muted-foreground">{row.when}</div>
      </motion.div>
    ))}
  </motion.div>
);

/**
 * PayoutCounter: kept for backward compatibility; used by the closing beat
 * of the hosting explainer.
 */
export const PayoutCounter = ({ target = 1240 }: { target?: number }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-lg"
  >
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payout scheduled</div>
    <motion.div
      className="mt-1 text-3xl font-bold text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      ${target.toLocaleString()}
    </motion.div>
    <div className="mt-1 text-[11px] text-muted-foreground">Released 24h after rental ends</div>
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

/** ListingWizardStrip: numbered steps for creating a listing. */
export const ListingWizardStrip = ({ steps }: { steps: string[] }) => (
  <div className="flex flex-wrap items-center justify-center gap-3">
    {steps.map((label, i) => (
      <motion.div
        key={label}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 * i }}
        className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {i + 1}
        </div>
        <div className="px-1 text-center text-[10px] font-semibold leading-tight text-foreground">{label}</div>
      </motion.div>
    ))}
  </div>
);

/** InboxRow: a single messaging thread preview, used inside dashboards. */
export const InboxRow = ({
  from,
  preview,
  unread = false,
  delay = 0,
}: {
  from: string;
  preview: string;
  unread?: boolean;
  delay?: number;
}) => (
  <motion.div
    initial={{ x: -10, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay }}
    className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm"
  >
    <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-foreground">{from}</div>
        {unread && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />}
      </div>
      <div className="truncate text-[11px] text-muted-foreground">{preview}</div>
    </div>
  </motion.div>
);
