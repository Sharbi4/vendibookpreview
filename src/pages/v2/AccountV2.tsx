import { Link } from 'react-router-dom';
import { Bell, CreditCard, FileText, Headphones, Lock, MessageCircle, ShieldCheck, Store, UserRound } from 'lucide-react';
import WorkspaceShell from '@/components/v2/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const groups = [
  { title: 'Profile', items: [[Store, 'Public profile & storefront', 'Your public identity, photos, and business details', '/account#section-personal'], [UserRound, 'Personal information', 'Name, email, phone, and profile photo', '/account#section-personal']] },
  { title: 'Trust & security', items: [[Lock, 'Sign-in & security', 'Password and connected sign-ins', '/account#section-security'], [ShieldCheck, 'Identity verification', 'Optional identity trust signal', '/verify-identity'], [Bell, 'Notifications', 'Email and in-app preferences', '/notification-preferences'], [MessageCircle, 'SMS', 'Optional text notification enrollment', '/sms']] },
  { title: 'Plan & privacy', items: [[CreditCard, 'Membership & billing', 'Your plan, renewals, and account charges', '/account/subscription'], [ShieldCheck, 'Privacy & sharing', 'Control what your storefront shows', '/account#section-privacy']] },
  { title: 'Help & policies', items: [[Headphones, 'Support', 'Help center and your support requests', '/help'], [FileText, 'Legal', 'Terms, privacy, refunds, and marketplace rules', '/legal']] },
] as const;
export default function AccountV2() {
  const { user, profile, isVerified } = useAuth();
  const name = profile?.full_name || user?.email || 'Your account';
  const initials = name.split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase();
  return <WorkspaceShell><div className="v2-page-stack"><header className="v2-page-heading"><p className="v2-eyebrow">Settings</p><h1>Account</h1><p>Your identity, preferences, plan, privacy, and support.</p></header>
    <section className="v2-account-identity"><Avatar className="h-20 w-20"><AvatarImage src={profile?.avatar_url || undefined} alt={name} /><AvatarFallback>{initials}</AvatarFallback></Avatar><div><h2>{name}</h2><p>{user?.email}</p>{isVerified && <span className="v2-verified"><ShieldCheck />Identity verified</span>}</div></section>
    <div className="v2-account-grid">{groups.map((group) => <section key={group.title}><h2>{group.title}</h2><div className="v2-card divide-y">{group.items.map(([Icon,label,hint,to]) => <Link to={to} className="v2-account-row" key={label}><Icon /><span><strong>{label}</strong><small>{hint}</small></span><span aria-hidden>›</span></Link>)}</div></section>)}</div>
  </div></WorkspaceShell>;
}