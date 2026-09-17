import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CreditCard,
  Eye,
  FileText,
  Headphones,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EditPersonalInfoSheet from '@/components/account/EditPersonalInfoSheet';
import EditPublicProfileSheet from '@/components/account/EditPublicProfileSheet';
import ChangePasswordSheet from '@/components/account/ChangePasswordSheet';
import PrivacySharingSection from '@/components/account/PrivacySharingSection';
import MembershipSummaryCard from '@/components/account/MembershipSummaryCard';
import { getDisplayInitials } from '@/lib/displayName';

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

function maskPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (!d) return 'Not on file';
  return `••• ••• ${d.slice(-4)}`;
}

type Row = [LucideIcon, string, string, string];

const linkGroups: { title: string; items: Row[] }[] = [
  {
    title: 'Payments',
    items: [
      [CreditCard, 'Payments & PayPal', 'Connection status, payouts, receipts, and disputes', '/dashboard/payments'],
      [Receipt, 'Purchases & receipts', 'Everything you have bought on Vendibook', '/account/purchases'],
      [FileText, 'Membership & billing', 'Your plan, renewals, and account charges', '/account/subscription'],
    ],
  },
  {
    title: 'Trust & security',
    items: [
      [ShieldCheck, 'Identity verification', 'Optional identity trust signal', '/identity-verification'],
      [Headphones, 'Support & disputes', 'Help center and your support requests', '/account/support'],
      [FileText, 'Legal', 'Terms, privacy, refunds, and marketplace rules', '/legal'],
    ],
  },
  {
    title: 'Notifications',
    items: [
      [Bell, 'Email & in-app notifications', 'Choose what Vendibook sends you', '/dashboard/notifications/settings'],
      [MessageCircle, 'Text messages (SMS)', 'Optional text alerts — opt in any time', '/sms'],
    ],
  },
];

export default function WorkspaceAccount() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProfileRow>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [openPersonal, setOpenPersonal] = useState(false);
  const [openPublic, setOpenPublic] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name, email, avatar_url, header_image_url, display_name, username, business_name, public_city, public_state, phone_number, identity_verified')
      .eq('id', user.id)
      .single();
    if (error || !data) {
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
      return;
    }
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

  const name = row.display_name || row.full_name || user?.email || 'Your account';

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Settings</p>
          <h1>Account</h1>
          <p>Your identity, payments, notifications, privacy, and support.</p>
        </header>

        {loading ? (
          <div className="v2-panel flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <section className="v2-account-identity">
              <button type="button" onClick={pickAvatar} aria-label="Change profile photo" className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={row.avatar_url || undefined} alt={name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </span>
                )}
              </button>
              <div>
                <h2>{name}</h2>
                <p>{row.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {row.identity_verified && (
                    <span className="v2-status is-ok">
                      <ShieldCheck />
                      Identity verified
                    </span>
                  )}
                  <button type="button" className="v2-btn-outline" onClick={() => setOpenPublic(true)}>
                    Edit public profile
                  </button>
                  <Link to={publicProfileHref} className="v2-btn-quiet">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Link>
                </div>
              </div>
            </section>

            <section className="v2-panel">
              <div className="v2-panel-head">
                <div>
                  <h2>Personal information</h2>
                  <p>Private to you — used for receipts, alerts, and account recovery.</p>
                </div>
              </div>
              <div>
                <button type="button" className="v2-account-row w-full text-left" onClick={() => setOpenPersonal(true)}>
                  <UserRound />
                  <span>
                    <strong>{row.full_name || 'Add your legal name'}</strong>
                    <small>Used for identity verification and payouts.</small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
                <button type="button" className="v2-account-row w-full text-left" onClick={() => setOpenPersonal(true)}>
                  <FileText />
                  <span>
                    <strong>{row.email || 'Add an email'}</strong>
                    <small>Receipts, alerts, and account recovery.</small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
                <button type="button" className="v2-account-row w-full text-left" onClick={() => setOpenPersonal(true)}>
                  <Lock />
                  <span>
                    <strong>{maskPhone(row.phone_number)}</strong>
                    <small>Reveal to view — contact support to change.</small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
                <button type="button" className="v2-account-row w-full text-left" onClick={() => setOpenPublic(true)}>
                  <Store />
                  <span>
                    <strong>{row.business_name || 'Add your business name'}</strong>
                    <small>Shown on your listings and public storefront.</small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
              </div>
            </section>

            <section className="v2-panel">
              <div className="v2-panel-head">
                <div>
                  <h2>Sign-in &amp; security</h2>
                  <p>Password and connected sign-ins.</p>
                </div>
              </div>
              <div>
                <button type="button" className="v2-account-row w-full text-left" onClick={() => setOpenPassword(true)}>
                  <KeyRound />
                  <span>
                    <strong>Change password</strong>
                    <small>Use a strong password unique to Vendibook.</small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
                <div className="v2-account-row">
                  <ShieldCheck />
                  <span>
                    <strong>Connected sign-ins</strong>
                    <small>{row.email ? `Email · ${row.email}` : 'Email sign-in only.'}</small>
                  </span>
                </div>
              </div>
            </section>

            {user && (
              <section className="v2-panel v2-embedded-section">
                <div className="v2-panel-head">
                  <div>
                    <h2>Privacy &amp; sharing</h2>
                    <p>Control exactly what your public storefront shows.</p>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <PrivacySharingSection userId={user.id} username={row.username} />
                </div>
              </section>
            )}

            {user && (
              <section className="v2-panel v2-embedded-section">
                <div className="p-4">
                  <MembershipSummaryCard />
                </div>
              </section>
            )}

            <div className="v2-account-grid">
              {linkGroups.map((group) => (
                <section className="v2-panel" key={group.title}>
                  <div className="v2-panel-head">
                    <div>
                      <h2>{group.title}</h2>
                    </div>
                  </div>
                  <div>
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
          </>
        )}
      </div>

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
