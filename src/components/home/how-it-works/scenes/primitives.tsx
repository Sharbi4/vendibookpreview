import { motion } from 'framer-motion';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  Lock,
  TrendingUp,
  Activity,
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
        {/* Parallax grid — slowly drifts to give the scene a living backplate. */}
        <motion.svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.07] mix-blend-overlay"
          animate={{ backgroundPositionX: [0, 32], backgroundPositionY: [0, 32] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          <defs>
            <pattern id="scene-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#scene-grid)" />
        </motion.svg>
        {/* Aurora light-beam sweep — travels diagonally, brand-tinted. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'linear-gradient(115deg, transparent 35%, hsl(var(--primary) / 0.14) 46%, hsl(var(--primary) / 0.22) 50%, hsl(var(--primary) / 0.14) 54%, transparent 65%)',
            mixBlendMode: 'screen',
          }}
          animate={{ x: ['-30%', '30%'] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
        />
        {/* Scanning horizon line — very faint, adds "systems monitoring" energy. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.55), transparent)',
            boxShadow: '0 0 12px hsl(var(--primary) / 0.6)',
          }}
          animate={{ top: ['12%', '88%', '12%'] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ boxShadow: 'inset 0 0 160px 20px hsl(var(--background) / 0.9)' }}
        />
        {/* Ambient floating orbs — subtle enterprise "atmosphere" behind
            every scene without competing with foreground content. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {[
            { size: 240, x: '8%', y: '18%', delay: 0, dur: 14, opacity: 0.16 },
            { size: 180, x: '78%', y: '12%', delay: 2, dur: 18, opacity: 0.12 },
            { size: 300, x: '68%', y: '72%', delay: 4, dur: 20, opacity: 0.10 },
            { size: 140, x: '22%', y: '80%', delay: 1, dur: 16, opacity: 0.14 },
          ].map((o, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: o.size,
                height: o.size,
                left: o.x,
                top: o.y,
                background: `radial-gradient(circle at 30% 30%, hsl(var(--primary) / ${o.opacity}), transparent 70%)`,
                filter: 'blur(2px)',
              }}
              animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
              transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

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
            data-scene-caption
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
  focus = 'sharp',
  price = '$248',
  rating = '4.9',
}: {
  variant?: 'neutral' | 'primary';
  label?: string;
  large?: boolean;
  /** 'sharp' foreground card, or 'blurred' — used to build DOF stacks behind the hero card. */
  focus?: 'sharp' | 'blurred';
  price?: string;
  rating?: string;
}) => {
  const isBlurred = focus === 'blurred';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${
        variant === 'primary' ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border'
      } bg-card shadow-[0_20px_45px_-18px_hsl(var(--primary)/0.35),0_10px_25px_-12px_hsl(var(--foreground)/0.35)] ${
        large ? 'h-44 w-60' : 'h-36 w-44'
      }`}
      style={isBlurred ? { filter: 'blur(6px) saturate(85%)', opacity: 0.55 } : undefined}
    >
      {/* Photo area: layered mesh + product silhouette + sharpening highlight */}
      <div
        className="relative h-[62%] w-full overflow-hidden"
        style={{
          backgroundImage: [
            'radial-gradient(120% 90% at 20% 10%, hsl(var(--primary) / 0.55), transparent 55%)',
            'radial-gradient(90% 80% at 90% 100%, hsl(var(--foreground) / 0.55), transparent 65%)',
            'radial-gradient(60% 60% at 65% 40%, hsl(var(--primary) / 0.25), transparent 70%)',
            'linear-gradient(135deg, hsl(var(--muted-foreground) / 0.35) 0%, hsl(var(--foreground) / 0.55) 100%)',
          ].join(','),
        }}
      >
        {/* Subject silhouette — reads as a crisp product photo */}
        <div
          aria-hidden
          className="absolute left-1/2 top-[58%] h-20 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[28%_35%_30%_32%/32%_28%_35%_30%] bg-gradient-to-br from-white/30 via-white/10 to-transparent shadow-[inset_0_-8px_16px_hsl(var(--foreground)/0.35),0_6px_18px_hsl(var(--foreground)/0.45)]"
        />
        {/* Sharpening top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        {/* Glossy sheen + soft vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/25" />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 30px hsl(var(--foreground)/0.35)' }} />
        {/* Film-grain style noise via SVG for crispness on retina */}
        <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.12] mix-blend-overlay">
          <filter id={`lcm-noise-${large ? 'l' : 's'}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#lcm-noise-${large ? 'l' : 's'})`} />
        </svg>
        {/* Pagination dots */}
        <div className="absolute inset-x-2 bottom-1.5 flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-sm" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/55" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
        </div>
        {/* Rating chip */}
        <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-bold text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
          <span className="text-primary">★</span>
          <span>{rating}</span>
        </span>
      </div>
      {/* Meta row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="space-y-1">
          <div className="h-2 w-16 rounded-full bg-foreground/55" />
          <div className="text-[11px] font-bold leading-none text-foreground">{price}</div>
        </div>
        {label && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
              variant === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {label}
          </span>
        )}
      </div>
      {/* Inner 1px highlight ring for crispness */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
    </div>
  );
};

/**
 * ListingCardStack — hero card with soft, out-of-focus twin cards behind it
 * for depth-of-field. Use in scenes where a "featured" listing needs cinematic
 * separation from its context (search results, favorites, recommendations).
 */
export const ListingCardStack = ({
  variant = 'primary',
  label,
  price,
  rating,
}: {
  variant?: 'neutral' | 'primary';
  label?: string;
  price?: string;
  rating?: string;
}) => (
  <div className="relative">
    {/* DOF ghosts — behind + offset, blurred */}
    <div className="absolute -left-6 -top-3 rotate-[-6deg]">
      <ListingCardMini focus="blurred" />
    </div>
    <div className="absolute -right-6 -bottom-2 rotate-[5deg]">
      <ListingCardMini focus="blurred" />
    </div>
    <div className="relative">
      <ListingCardMini variant={variant} label={label} large price={price} rating={rating} />
    </div>
  </div>
);


export const BadgeStamp = ({ label }: { label: string }) => (
  <motion.div
    initial={{ scale: 1.35, opacity: 0, rotate: -6 }}
    animate={{ scale: 1, opacity: 1, rotate: 0 }}
    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
    className="relative flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-primary shadow-[0_10px_28px_-8px_hsl(var(--primary)/0.55)]"
  >
    {/* Impact shockwave rings */}
    {[0, 0.15].map((d, i) => (
      <motion.span
        key={i}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/70"
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ scale: 1.75, opacity: 0 }}
        transition={{ delay: d, duration: 0.9, ease: 'easeOut' }}
      />
    ))}
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 14 }}
      className="inline-flex"
    >
      <Check className="h-5 w-5" strokeWidth={3} />
    </motion.span>
    <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
  </motion.div>
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
        const selectedIdx = selected.indexOf(day);
        return (
          <motion.div
            key={day}
            initial={{ scale: 1 }}
            animate={
              isSelected
                ? { scale: [1, 1.18, 1], backgroundColor: 'hsl(var(--primary))' }
                : {}
            }
            transition={{ delay: selectedIdx * 0.12, duration: 0.45, ease: 'easeOut' }}
            className={`relative flex aspect-square items-center justify-center rounded-md text-xs font-medium ${
              isSelected
                ? 'text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.6)]'
                : isBooked
                  ? 'bg-muted-foreground/25 text-muted-foreground line-through'
                  : 'bg-muted text-foreground'
            }`}
          >
            {isSelected && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-md border border-primary"
                initial={{ scale: 1, opacity: 0.75 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ delay: 0.2 + selectedIdx * 0.12, duration: 0.9, ease: 'easeOut' }}
              />
            )}
            {isBooked && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-md opacity-40"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.35) 0 2px, transparent 2px 5px)',
                }}
              />
            )}
            <span className="relative">{day}</span>
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
    {steps.map((s, i) => {
      const leftFilled = i > 0 && s.state !== 'pending';
      const rightFilled = i < steps.length - 1 && s.state === 'done';
      return (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="relative flex w-full items-center">
            {/* Left rail */}
            <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
              {i > 0 && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: leftFilled ? '100%' : '0%' }}
                  transition={{ delay: 0.05 * i, duration: 0.5, ease: 'easeOut' }}
                />
              )}
            </div>
            {/* Node with concentric ring for active */}
            <div className="relative flex h-3 w-3 items-center justify-center">
              {s.state === 'active' && (
                <>
                  <motion.span
                    aria-hidden
                    className="absolute inset-[-6px] rounded-full border border-primary/50"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.span
                    aria-hidden
                    className="absolute inset-[-3px] rounded-full border border-primary/70"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    style={{ borderStyle: 'dashed' }}
                  />
                </>
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 * i, type: 'spring', stiffness: 220, damping: 18 }}
                className={`h-3 w-3 rounded-full ${dot(s.state)}`}
              />
            </div>
            {/* Right rail */}
            <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
              {i < steps.length - 1 && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: rightFilled ? '100%' : '0%' }}
                  transition={{ delay: 0.05 * (i + 1), duration: 0.5, ease: 'easeOut' }}
                />
              )}
            </div>
          </div>
          <span className={`text-[10px] font-medium leading-tight text-center ${s.state === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
            {s.label}
          </span>
        </div>
      );
    })}
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
    className="w-full max-w-md"
  >
    <AppFrame path={`/${role.toLowerCase()}/transactions`}>
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

      {footer ? (
        <div className="mt-3 border-t border-border/70 pt-3 text-xs text-foreground/80">{footer}</div>
      ) : (
        <div className="mt-3 border-t border-border/70 pt-3">
          <div className="flex items-center justify-between gap-2">
            <KPIStat label="Progress" value={Math.round((timeline.filter(s => s.state !== 'pending').length / timeline.length) * 100)} suffix="%" delta="on track" />
            <KPIStat label="Est. close" value={3} suffix="d" delay={0.15} />
            <div className="flex-1 pl-1">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Momentum</div>
              <Sparkline delay={0.2} />
            </div>
          </div>
        </div>
      )}
    </AppFrame>
  </motion.div>
);


/**
 * PaymentOptionsPanel: shows the actual purchase summary and the payment
 * methods available on Vendibook — PayPal, equipment financing (when eligible), and
 * pay-in-person (when offered by the seller/host).
 */
export const PaymentOptionsPanel = ({
  price,
  fees,
  showFinancing = true,
  showPayInPerson = true,
}: {
  price: string;
  fees: string;
  showFinancing?: boolean;
  showPayInPerson?: boolean;
}) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="w-80"
  >
    <AppFrame path="/checkout" url="secure.vendibook.com">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Transaction details
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Listing price</span><span className="font-semibold text-foreground">{price}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="font-semibold text-foreground">{fees}</span></div>
        <div className="mt-2 flex justify-between border-t border-border/70 pt-2 text-sm"><span className="font-bold text-foreground">Total</span><span className="font-bold text-foreground">$—</span></div>
      </div>
      <div className="mt-3 space-y-1.5">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/8 px-2.5 py-2 text-xs"
        >
          <CreditCard className="h-4 w-4 text-primary" />
          <div className="flex-1 font-semibold text-foreground">Pay online (PayPal)</div>
          <span className="text-[10px] font-bold text-primary">Selected</span>
        </motion.div>
        {showFinancing && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs"
          >
            <ShieldCheck className="h-4 w-4 text-foreground/70" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">Equipment financing</div>
              <div className="text-[10px] text-muted-foreground">Third-party lender. Subject to approval.</div>
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
      <div className="mt-3 flex items-center gap-1.5 border-t border-border/70 pt-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Lock className="h-2.5 w-2.5 text-primary" />
        256-bit TLS · PCI-DSS handled by PayPal
      </div>
    </AppFrame>
  </motion.div>
);


/**
 * PayoutTimeline: shows the actual Vendibook payout schedule for hosts —
 * paid on PayPal checkout, host payout released 24h after the rental ends.
 */
export const PayoutTimeline = () => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="w-full max-w-md"
  >
    <AppFrame path="/host/payouts">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" /> Payout schedule
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/30">
          Instant payment protection
        </span>
      </div>
      {[
        { label: 'Renter payment received (PayPal)', when: 'Booking confirmed', done: true },
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
      <div className="mt-3 border-t border-border/70 pt-3">
        <div className="flex items-center justify-between gap-2">
          <KPIStat label="Payout" value={1240} prefix="$" delta="+18%" />
          <KPIStat label="Bookings" value={7} suffix=" wk" delay={0.1} />
          <div className="flex-1 pl-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Trend</div>
            <Sparkline delay={0.2} />
          </div>
        </div>
      </div>
    </AppFrame>
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

/* ---------------------------------------------------------------------------
 * Enterprise chrome primitives
 * -------------------------------------------------------------------------
 * These sit around the existing product mocks to make every scene read like
 * a real SaaS product screenshot — window chrome, secure URL, live indicators,
 * animated KPI counters, sparkline data — instead of a flat card. They're
 * applied inside DashboardMock / PaymentOptionsPanel / PayoutTimeline so
 * every scene inherits the upgraded look with zero per-scene changes.
 * ------------------------------------------------------------------------- */

/** macOS-style window with a secure URL bar and live "connected" pill. */
export const AppFrame = ({
  url = 'app.vendibook.com',
  path = '/dashboard',
  children,
  live = true,
}: {
  url?: string;
  path?: string;
  children: ReactNode;
  live?: boolean;
}) => (
  <div className="relative w-full max-w-md">
    {/* DOF backdrop — soft, blurred, offset ghost frame for cinematic depth. */}
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl opacity-70"
      style={{
        background:
          'radial-gradient(60% 55% at 30% 20%, hsl(var(--primary) / 0.35), transparent 70%), radial-gradient(55% 50% at 80% 90%, hsl(var(--foreground) / 0.25), transparent 72%)',
        filter: 'blur(18px)',
      }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -right-4 -top-3 h-full w-full -z-10 rounded-2xl border border-border/40 bg-card/60 opacity-60"
      style={{ filter: 'blur(4px)', transform: 'rotate(2deg) scale(0.96)' }}
    />
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.45),0_15px_40px_-15px_hsl(var(--foreground)/0.35)] ring-1 ring-border/60 backdrop-blur">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-2 flex flex-1 items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
          <Lock className="h-2.5 w-2.5 text-primary" />
          <span className="truncate"><span className="text-foreground/70">{url}</span>{path}</span>
        </div>
        {live && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/30">
            <LiveDot />
            Live
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
      {/* Crisp inner highlight for retina sharpness */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
    </div>
  </div>
);

/** A pulsing dot to signal "live" / connected state. */
export const LiveDot = () => (
  <span className="relative flex h-1.5 w-1.5">
    <motion.span
      className="absolute inline-flex h-full w-full rounded-full bg-primary/60"
      animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
    />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
  </span>
);

/** Animated count-up KPI stat used inside dashboard footers. */
export const KPIStat = ({
  label,
  value,
  prefix = '',
  suffix = '',
  delta,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  delay?: number;
}) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startAt = performance.now() + delay * 1000;
    let raf = 0;
    const dur = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / dur));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  const formatted = value >= 100
    ? Math.round(display).toLocaleString()
    : display.toFixed(1);
  return (
    <div className="flex-1 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-sm font-bold tabular-nums text-foreground">
          {prefix}{formatted}{suffix}
        </span>
        {delta && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary">
            <TrendingUp className="h-2.5 w-2.5" />
            {delta}
          </span>
        )}
      </div>
    </div>
  );
};

/** Compact sparkline SVG that draws itself on mount. */
export const Sparkline = ({
  points = [12, 18, 14, 22, 20, 28, 26, 34, 32, 42, 40, 48],
  width = 120,
  height = 28,
  delay = 0,
}: {
  points?: number[];
  width?: number;
  height?: number;
  delay?: number;
}) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#spark-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.4, duration: 0.5 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 1.2, ease: 'easeOut' }}
      />
      {/* Pulsing endpoint marker */}
      {(() => {
        const lastX = (points.length - 1) * step;
        const last = points[points.length - 1];
        const lastY = height - ((last - min) / range) * (height - 4) - 2;
        return (
          <g>
            <motion.circle
              cx={lastX}
              cy={lastY}
              r={5}
              fill="hsl(var(--primary))"
              opacity={0.35}
              initial={{ scale: 0 }}
              animate={{ scale: [0.8, 1.8, 0.8] }}
              transition={{ delay: delay + 1.1, duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: `${lastX}px ${lastY}px` }}
            />
            <motion.circle
              cx={lastX}
              cy={lastY}
              r={2.5}
              fill="hsl(var(--primary))"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 1.1, type: 'spring', stiffness: 260, damping: 14 }}
              style={{ transformOrigin: `${lastX}px ${lastY}px` }}
            />
          </g>
        );
      })()}
    </svg>
  );
};

/** Rolling activity ticker — three most-recent events, staggered in. */
export const ActivityTicker = ({
  events,
}: {
  events: Array<{ label: string; time: string }>;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Activity className="h-2.5 w-2.5 text-primary" />
      Recent activity
    </div>
    {events.map((e, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 + i * 0.15 }}
        className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1 text-[10px]"
      >
        <span className="flex items-center gap-1.5 truncate text-foreground">
          <LiveDot />
          <span className="truncate font-medium">{e.label}</span>
        </span>
        <span className="flex-shrink-0 tabular-nums text-muted-foreground">{e.time}</span>
      </motion.div>
    ))}
  </div>
);

/* ---------------------------------------------------------------------------
 * High-fidelity motion primitives
 * -------------------------------------------------------------------------
 * Small, self-contained motion pieces used as accents inside scenes to lift
 * the whole set to enterprise-grade production polish without additional
 * scene-file churn.
 * ------------------------------------------------------------------------- */

/** Confetti burst — brand-tinted, physics-shaped, one-shot. */
export const Confetti = ({ count = 26, spread = 220 }: { count?: number; spread?: number }) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * (i / Math.max(1, count - 1))) - Math.PI / 2;
        const dist = spread * (0.55 + Math.random() * 0.55);
        const rand = Math.random();
        return {
          i,
          x: Math.cos(angle) * dist + (Math.random() - 0.5) * 30,
          y: Math.sin(angle) * dist * 0.7 - Math.random() * 60,
          rot: (Math.random() - 0.5) * 720,
          hue: rand < 0.55 ? 'hsl(var(--primary))' : rand < 0.8 ? 'hsl(var(--primary) / 0.55)' : 'hsl(var(--foreground) / 0.8)',
          size: 4 + Math.random() * 5,
          shape: rand > 0.6 ? 'square' : 'rect',
          delay: Math.random() * 0.15,
          dur: 1.2 + Math.random() * 0.8,
        };
      }),
    [count, spread],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div className="relative h-0 w-0">
        {pieces.map((p) => (
          <motion.span
            key={p.i}
            aria-hidden
            className="absolute"
            style={{
              width: p.shape === 'square' ? p.size : p.size * 0.6,
              height: p.size,
              background: p.hue,
              borderRadius: 1,
              boxShadow: '0 2px 6px hsl(var(--foreground) / 0.25)',
              left: 0,
              top: 0,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: p.y, opacity: [1, 1, 0], rotate: p.rot }}
            transition={{ delay: p.delay, duration: p.dur, ease: [0.16, 0.84, 0.44, 1] }}
          />
        ))}
      </div>
    </div>
  );
};

/** Animated circular progress ring, draws in on mount. */
export const ProgressRing = ({
  value = 0.72,
  size = 68,
  stroke = 6,
  label,
  sub,
}: {
  value?: number;
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
}) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - value) }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.55))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="text-xs font-bold tabular-nums text-foreground">{label}</span>}
        {sub && <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
};

/** Sliding notification toast — appears once, then persists. */
export const NotificationToast = ({
  title,
  body,
  delay = 0.6,
}: {
  title: string;
  body?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ y: -14, x: 14, opacity: 0, scale: 0.96 }}
    animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
    className="pointer-events-none inline-flex items-start gap-2 rounded-xl border border-primary/40 bg-card/95 px-2.5 py-1.5 shadow-[0_16px_40px_-14px_hsl(var(--primary)/0.55)] ring-1 ring-primary/20 backdrop-blur"
  >
    <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Check className="h-2.5 w-2.5" strokeWidth={4} />
    </span>
    <div className="min-w-0">
      <div className="text-[10px] font-bold leading-tight text-foreground">{title}</div>
      {body && <div className="mt-0.5 truncate text-[9px] text-muted-foreground">{body}</div>}
    </div>
  </motion.div>
);

/** Three-dot typing indicator. */
export const TypingDots = () => (
  <span className="inline-flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-current"
        animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
      />
    ))}
  </span>
);

/** Diagonal scan-line sweep that passes across a card once and repeats. */
export const Scanline = ({ delay = 0.4, duration = 2.4 }: { delay?: number; duration?: number }) => (
  <motion.span
    aria-hidden
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
  >
    <motion.span
      className="absolute -inset-y-4 w-1/3"
      style={{
        background:
          'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.22), transparent)',
        filter: 'blur(2px)',
      }}
      initial={{ x: '-120%' }}
      animate={{ x: '260%' }}
      transition={{ delay, duration, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
    />
  </motion.span>
);

