import { Link } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  CreditCard,
  FileText,
  Headphones,
  Lock,
  MessageCircle,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Row = [LucideIcon, string, string, string];

const groups: { title: string; items: Row[] }[] = [
  {
    title: 'Profile',
    items: [
      [UserRound, 'Personal information', 'Name, email, phone, and profile photo', '/account'],
      [Store, 'Public profile & storefront', 'How buyers and renters see you', '/account#section-privacy'],
      [Briefcase, 'Business information', 'Business details used on listings and bookings', '/account'],
    ],
  },
  {
    title: 'Payments',
    items: [
      [CreditCard, 'Payments & PayPal', 'Connection status, payouts, receipts, and disputes', '/dashboard/payments'],
      [FileText, 'Membership & billing', 'Your plan, renewals, and account charges', '/account/subscription'],
      [FileText, 'Purchases & receipts', 'Everything you have bought on Vendibook', '/account/purchases'],
    ],
  },
  {
    title: 'Trust & security',
    items: [
      [ShieldCheck, 'Identity verification', 'Optional identity trust signal', '/verify-identity'],
      [Lock, 'Sign-in & security', 'Password and connected sign-ins', '/account'],
    ],
  },
  {
    title: 'Notifications',
    items: [
      [Bell, 'Email & in-app notifications', 'Choose what Vendibook sends you', '/notification-preferences'],
      [MessageCircle, 'Text messages (SMS)', 'Optional text alerts — opt in any time', '/sms'],
    ],
  },
  {
    title: 'Help & policies',
    items: [
      [Headphones, 'Support & disputes', 'Help center and your support requests', '/account/support'],
      [FileText, 'Legal', 'Terms, privacy, refunds, and marketplace rules', '/legal'],
    ],
  },
];

export default function WorkspaceAccount() {
  const { user, profile, isVerified } = useAuth();
  const name = profile?.full_name || user?.email || 'Your account';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Settings</p>
          <h1>Account</h1>
          <p>Your identity, payments, notifications, privacy, and support.</p>
        </header>

        <section className="v2-account-identity">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2>{name}</h2>
            <p>{user?.email}</p>
            {isVerified && (
              <span className="v2-verified">
                <ShieldCheck />
                Identity verified
              </span>
            )}
          </div>
        </section>

        <div className="v2-account-grid">
          {groups.map((group) => (
            <section key={group.title}>
              <h2>{group.title}</h2>
              <div className="v2-card divide-y">
                {group.items.map(([Icon, label, hint, to]) => (
                  <Link to={to} className="v2-account-row" key={label}>
                    <Icon />
                    <span>
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                    <span aria-hidden>›</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </WorkspaceShell>
  );
}
