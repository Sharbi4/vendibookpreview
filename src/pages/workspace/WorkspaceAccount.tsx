import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { PageHeader, StatusPill, ws, type StatusTone } from '@/components/workspace/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EditPersonalInfoSheet from '@/components/account/EditPersonalInfoSheet';
import EditPublicProfileSheet from '@/components/account/EditPublicProfileSheet';
import ChangePasswordSheet from '@/components/account/ChangePasswordSheet';
import { getDisplayInitials } from '@/lib/displayName';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { PAYOUT_METHOD_LABEL, PAYOUT_STATUS_LABEL, type PayoutPreferenceStatus } from '@/lib/payouts/methods';
import { SectionChips, SectionIndex, SettingsRow, SettingsSection, rowActionCls, type IndexItem } from '@/components/workspace/account/SettingsKit';
import { maskPhone } from '@/components/workspace/account/maskPhone';
import { scrollToSection } from '@/components/workspace/account/scrollToSection';
import VerificationSettings from '@/components/workspace/account/VerificationSettings';
import MembershipSettings from '@/components/workspace/account/MembershipSettings';
import TaxExemptionSettings from '@/components/workspace/account/TaxExemptionSettings';
import PrivacySettings from '@/components/workspace/account/PrivacySettings';

interface ProfileRow {
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  header_image_url: string;
  display_name: string;
  username: string;
  business_name: string;
  public_city: string;
  public_state: string;
  phone_number: string;
  identity_verified: boolean;
}

const EMPTY: ProfileRow = {
  full_name: '', first_name: '', last_name: '', email: '',
  avatar_url: '', header_image_url: '', display_name: '', username: '',
  business_name: '', public_city: '', public_state: '', phone_number: '',
  identity_verified: false,
};

const SECTIONS: IndexItem[] = [
  { id: 'profile', label: 'Profile & business' },
  { id: 'verification', label: 'Verification' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'membership', label: 'Membership' },
  { id: 'tax', label: 'Tax exemption' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'security', label: 'Security' },
];

const PAYOUT_TONE: Record<PayoutPreferenceStatus, StatusTone> = {
  not_set: 'muted',
  pending_review: 'warn',
  verified: 'ok',
  needs_attention: 'alert',
};

function SkeletonSection() {
  return (
    <div className={ws.surface + ' divide-y divide-[#F1ECE5]'} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 px-5 py-5 sm:px-6">
          <span className={ws.skeleton + ' block h-4 w-32'} />
          <span className={ws.skeleton + ' block h-3.5 w-56 max-w-full'} />
        </div>
      ))}
    </div>
  );
}

export default function WorkspaceAccount() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const payout = usePayoutPreference();

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [row, setRow] = useState<ProfileRow>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [openPersonal, setOpenPersonal] = useState(false);
  const [openPublic, setOpenPublic] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [openCloseAccount, setOpenCloseAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (loading || location.hash !== '#section-payments') return;
    navigate('/dashboard/account/payouts', { replace: true });
  }, [loading, location.hash, navigate]);

  // Deep links such as /dashboard/account#membership scroll to that section once loaded.
  useEffect(() => {
    if (loading) return;
    const id = location.hash.replace('#', '');
    if (!id || !SECTIONS.some((s) => s.id === id)) return;
    requestAnimationFrame(() => { scrollToSection(id, false); });
  }, [loading, location.hash]);

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name, email, avatar_url, header_image_url, display_name, username, business_name, public_city, public_state, phone_number, identity_verified')
      .eq('id', user.id)
      .single();
    if (error || !data) {
      setLoadFailed(true);
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
      return;
    }
    setLoadFailed(false);
    setRow({
      full_name: data.full_name || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || user.email || '',
      avatar_url: data.avatar_url || '',
      header_image_url: (data as { header_image_url?: string }).header_image_url || '',
      display_name: data.display_name || '',
      username: data.username || '',
      business_name: data.business_name || '',
      public_city: data.public_city || '',
      public_state: data.public_state || '',
      phone_number: data.phone_number || '',
      identity_verified: !!data.identity_verified,
    });
  };

  const retryLoad = async () => {
    setLoading(true);
    await loadProfile();
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      await loadProfile();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const initials = useMemo(
    () => getDisplayInitials({ first_name: row.first_name, last_name: row.last_name, full_name: row.full_name }),
    [row],
  );

  const publicProfileHref = row.username ? `/u/${row.username}` : `/u/${user?.id}`;

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Up to 5MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatars/${Date.now()}.${ext}`;
      const up = await supabase.storage.from('listing-images').upload(path, file);
      if (up.error) throw up.error;
      const url = supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (error) throw error;
      setRow((r) => ({ ...r, avatar_url: url }));
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Avatar updated' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const pickAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleAvatarUpload(f);
    };
    input.click();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  };

  const name = row.display_name || row.full_name || user?.email || 'Your account';
  const place = [row.public_city, row.public_state].filter(Boolean).join(', ');
  const publicLine = [row.username ? `@${row.username}` : null, place || null].filter(Boolean).join(' · ');
  const pref = payout.preference;
  const payoutStatus: PayoutPreferenceStatus = pref?.status ?? 'not_set';
  const phoneMasked = maskPhone(row.phone_number);

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Settings"
            title="Account"
            description="Your business profile, verification, payouts and plan in one place."
            actions={<Link to={publicProfileHref} className={ws.secondary}>View public profile</Link>}
          />

          <div className="grid gap-8 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                {!loading && !loadFailed && <SectionIndex items={SECTIONS} />}
              </div>
            </aside>

            <div className="flex min-w-0 max-w-[760px] flex-col gap-10 sm:gap-12">
              {!loading && !loadFailed && <SectionChips items={SECTIONS} />}
              {loading ? (
                <>
                  <SkeletonSection />
                  <SkeletonSection />
                  <span className="sr-only" role="status">Loading your account</span>
                </>
              ) : loadFailed ? (
                <section className={ws.surface + ' px-5 py-8 sm:px-8'} role="alert">
                  <p className="text-[17px] font-semibold tracking-[-0.01em]">Your account details couldn’t be loaded.</p>
                  <p className={ws.body + ' mt-1.5 max-w-xl'}>Nothing has changed. Check your connection and try again.</p>
                  <button type="button" onClick={() => void retryLoad()} className={ws.secondary + ' mt-5'}>Try again</button>
                </section>
              ) : (
                <>
                  {/* Profile & business */}
                  <SettingsSection
                    id="profile"
                    title="Profile & business"
                    description="Private details are used for receipts, payouts and account recovery. Your business details appear on your listings."
                  >
                    <li className="flex items-center gap-4 px-5 py-5 sm:px-6">
                      <button
                        type="button"
                        onClick={pickAvatar}
                        aria-label="Change profile photo"
                        className="group relative shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]"
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={row.avatar_url || undefined} alt={name} className="object-cover" />
                          <AvatarFallback className="bg-[#F3EEE7] text-[18px] font-semibold text-[#1C1B1A]">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[#1C1B1A] shadow-[0_0_0_1px_rgba(28,27,26,0.12),0_2px_6px_rgba(28,27,26,0.12)]">
                          {uploading ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : <Camera aria-hidden="true" className="h-3 w-3" />}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-semibold tracking-[-0.01em] text-[#1C1B1A]">{name}</p>
                        <p className="truncate text-[13px] text-[#8A847B]">{publicLine || row.email}</p>
                        {row.identity_verified && <StatusPill tone="ok" className="mt-1.5">Identity verified</StatusPill>}
                      </div>
                      <button type="button" className={rowActionCls + ' shrink-0'} onClick={pickAvatar} disabled={uploading}>
                        {uploading ? 'Uploading…' : 'Change photo'}
                      </button>
                    </li>
                    <SettingsRow
                      label="Legal name"
                      value={row.full_name || 'Not provided'}
                      muted={!row.full_name}
                      hint="Used for identity checks, receipts and payouts."
                      action={{ label: row.full_name ? 'Edit' : 'Add', onClick: () => setOpenPersonal(true) }}
                    />
                    <SettingsRow
                      label="Email"
                      value={row.email || 'Not provided'}
                      muted={!row.email}
                      action={{ label: row.email ? 'Edit' : 'Add', onClick: () => setOpenPersonal(true) }}
                    />
                    <SettingsRow
                      label="Phone on file"
                      value={phoneMasked ?? 'Not provided'}
                      muted={!phoneMasked}
                      hint={phoneMasked ? 'Locked for security. Contact support to change it.' : 'Contact support to add a phone number to your account.'}
                      action={phoneMasked ? { label: 'View', onClick: () => setOpenPersonal(true) } : { label: 'Get help', to: '/account/support' }}
                    />
                    <SettingsRow
                      label="Business name"
                      value={row.business_name || 'Not provided'}
                      muted={!row.business_name}
                      hint="Shown on your listings and storefront."
                      action={{ label: row.business_name ? 'Edit' : 'Add', onClick: () => setOpenPublic(true) }}
                    />
                    <SettingsRow
                      label="Public profile"
                      value={[row.display_name || row.full_name || null, publicLine || null].filter(Boolean).join(' · ') || 'Add a display name and location'}
                      muted={!row.display_name && !row.full_name}
                      hint="Display name, username, location, photo and cover image."
                      action={{ label: 'Edit', onClick: () => setOpenPublic(true) }}
                    />
                    <SettingsRow
                      label="Walkthrough availability"
                      value="Weekly hours, timezone and blocked dates for video walkthroughs."
                      muted
                      action={{ label: 'Manage', to: '/dashboard/account/scheduling' }}
                    />
                  </SettingsSection>

                  <VerificationSettings identityVerified={row.identity_verified} />

                  {/* Payouts */}
                  <SettingsSection
                    id="payouts"
                    title="Payouts"
                    description="Where your earnings go and how buyers pay you."
                  >
                    <SettingsRow
                      label="Payout method"
                      status={payout.isLoading ? null : <StatusPill tone={PAYOUT_TONE[payoutStatus]}>{PAYOUT_STATUS_LABEL[payoutStatus]}</StatusPill>}
                      value={payout.isLoading
                        ? <span className={ws.skeleton + ' block h-4 w-40'} aria-label="Loading" />
                        : pref
                          ? [PAYOUT_METHOD_LABEL[pref.method], pref.masked_destination].filter(Boolean).join(' · ')
                          : 'No payout method yet. You can list and take bookings before adding one.'}
                      muted={!pref}
                      hint={!payout.isLoading ? 'For payouts Vendibook reviews and sends. PayPal, Venmo, Cash App or bank transfer.' : undefined}
                      action={!payout.isLoading ? { label: pref ? 'Edit' : 'Add', to: '/dashboard/account/payouts' } : undefined}
                    />
                    <SettingsRow
                      label="Payment connections"
                      value="PayPal for sales, Square for rental card payments."
                      muted
                      action={{ label: 'Manage', to: '/dashboard/payments/setup' }}
                    />
                    <SettingsRow
                      label="Earnings & payouts"
                      value="Balances, payout history and receipts."
                      muted
                      action={{ label: 'View', to: '/dashboard/payments' }}
                    />
                  </SettingsSection>

                  <MembershipSettings />

                  <TaxExemptionSettings />

                  {/* Notifications */}
                  <SettingsSection id="notifications" title="Notifications" description="Choose how Vendibook reaches you about offers, bookings, messages and payouts.">
                    <SettingsRow label="Email & in-app" value="Messages, offers, bookings, sales and disputes." muted action={{ label: 'Manage', to: '/dashboard/notifications/settings' }} />
                    <SettingsRow label="Text messages (SMS)" value="Optional text alerts. Opt in or out any time." muted action={{ label: 'Manage', to: '/sms' }} />
                  </SettingsSection>

                  {user && <PrivacySettings userId={user.id} />}

                  {/* Security */}
                  <SettingsSection id="security" title="Security" description="Sign-in, support and your account.">
                    <SettingsRow label="Password" value="••••••••••" action={{ label: 'Change', onClick: () => setOpenPassword(true) }} />
                    <SettingsRow label="Sign-in method" value={row.email ? `Email · ${row.email}` : 'Email sign-in'} />
                    <SettingsRow label="Support & safety" value="App support, safety reports and order cases." muted action={{ label: 'View', to: '/account/support' }} />
                    <SettingsRow label="Legal" value="Terms, privacy, refunds and marketplace rules." muted action={{ label: 'View', to: '/legal' }} />
                    <SettingsRow
                      label="Sign out"
                      value="Sign out of Vendibook on this device."
                      muted
                      action={{ label: signingOut ? 'Signing out…' : 'Sign out', onClick: () => void handleSignOut(), disabled: signingOut }}
                    />
                    <SettingsRow
                      label="Close account"
                      value="Request account closure from our support team."
                      muted
                      action={{ label: 'Close account', onClick: () => setOpenCloseAccount(true) }}
                    />
                  </SettingsSection>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openCloseAccount} onOpenChange={setOpenCloseAccount}>
        <DialogContent className="sale-light commerce-readable sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request account closure</DialogTitle>
            <DialogDescription className="text-[#57514b]">
              Email support from the address on your account. We’ll confirm your request and review any open bookings, sales, payouts, or subscriptions before closing your account.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-[#57514b]">Transaction records may need to be retained. Opening this email does not close your account or cancel a subscription.</p>
          <p className="text-sm">Account email: <strong>{user?.email || row.email}</strong></p>
          <DialogFooter className="gap-2.5 sm:gap-2.5">
            <button type="button" className={ws.secondary} onClick={() => setOpenCloseAccount(false)}>Keep my account</button>
            <a
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-[#1C1B1A] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#33302C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]"
              href={`mailto:support@vendibook.com?subject=${encodeURIComponent('Vendibook account closure request')}&body=${encodeURIComponent('Hello Vendibook Support,\n\nPlease close my Vendibook account associated with ' + (user?.email || row.email) + '. Please let me know if any open transactions or subscriptions need attention.\n\nThank you.')}`}
            >
              Email closure request
            </a>
          </DialogFooter>
          <p className="text-xs text-[#57514b]">If your email app doesn’t open, email support@vendibook.com from your account address.</p>
        </DialogContent>
      </Dialog>

      {user && (
        <>
          <EditPersonalInfoSheet
            open={openPersonal}
            onOpenChange={setOpenPersonal}
            userId={user.id}
            initial={{ full_name: row.full_name, email: row.email, phone_number: row.phone_number }}
            onSaved={async () => { await loadProfile(); await refreshProfile(); }}
          />
          <EditPublicProfileSheet
            open={openPublic}
            onOpenChange={setOpenPublic}
            userId={user.id}
            initials={initials}
            initial={{
              avatar_url: row.avatar_url,
              header_image_url: row.header_image_url,
              display_name: row.display_name,
              username: row.username,
              business_name: row.business_name,
              public_city: row.public_city,
              public_state: row.public_state,
            }}
            onSaved={async () => { await loadProfile(); }}
          />
          <ChangePasswordSheet open={openPassword} onOpenChange={setOpenPassword} email={row.email} />
        </>
      )}
    </WorkspaceShell>
  );
}
