import { Link } from 'react-router-dom';
import { BadgeCheck, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';
import './auth-brand-panel.css';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify';

interface AuthBrandPanelProps {
  mode: AuthMode;
}

const TRUST_POINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Truck, text: 'Buy, sell and rent food trucks, trailers and kitchens' },
  { icon: ShieldCheck, text: 'Secure checkout with Vendibook payment protection' },
  { icon: BadgeCheck, text: 'Verified members and messages scanned for scams' },
];

/**
 * Desktop-only brand side of the /auth split layout (photo under a charcoal
 * overlay; the image loads only at lg+ via CSS). Purely presentational:
 * no auth state, handlers or tracking live here.
 */
export const AuthBrandPanel = ({ mode }: AuthBrandPanelProps) => {
  const isSignup = mode === 'signup';
  const headline = isSignup
    ? 'Start your mobile food business on Vendibook.'
    : 'Welcome back to the mobile food marketplace.';
  const subline = isSignup
    ? 'One account to buy, sell, rent and host, with everything in one place.'
    : 'Pick up where you left off with your listings, messages, bookings and purchases.';

  return (
    <aside aria-label="About Vendibook" className="auth-brand-panel__base relative hidden lg:block">
      <div aria-hidden className="auth-brand-panel__edge pointer-events-none absolute inset-y-0 right-0 z-20 w-1" />
      <div className="auth-brand-panel sticky top-0 flex h-screen flex-col justify-between overflow-hidden px-12 py-10 xl:px-16 xl:py-12">
        {/* Photo + overlay (decorative) */}
        <div aria-hidden className="auth-brand-panel__photo pointer-events-none absolute inset-0" />
        <div aria-hidden className="auth-brand-panel__overlay pointer-events-none absolute inset-0" />

        {/* Logo */}
        <div className="relative z-10">
          <Link
            to="/"
            aria-label="Vendibook home"
            className="auth-brand-panel__logo-tile inline-flex items-center rounded-xl px-4 py-3 transition-transform hover:-translate-y-0.5"
          >
            <img src="/brand/vendibook-logo-email.png" alt="Vendibook" className="h-9 w-auto" width={121} height={36} />
          </Link>
        </div>

        {/* Message + trust points, anchored low over the darkest part of the photo */}
        <div className="relative z-10 max-w-[31rem]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff7a4a]">
            The mobile food marketplace
          </p>
          <p className="mt-3 text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.02em] text-white xl:text-[3rem]">
            {headline}
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/75">{subline}</p>

          <div aria-hidden className="auth-brand-panel__divider my-7 h-px w-full" />

          <ul className="space-y-3.5">
            {TRUST_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className="auth-brand-panel__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                </span>
                <span className="text-[0.95rem] font-semibold leading-snug text-white">{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-9 text-xs text-white/45">© {new Date().getFullYear()} Vendibook</p>
        </div>
      </div>
    </aside>
  );
};
