import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Lock, KeyRound, Shield, Bell, CreditCard,
  ShieldCheck, FileText, Loader2, Eye, Sparkles as _s,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import IdentitySummaryCard from '@/components/account/IdentitySummaryCard';
import PrivacySharingSection from '@/components/account/PrivacySharingSection';
import { RowLink, SectionCard } from '@/components/account/RowLink';
import EditPersonalInfoSheet from '@/components/account/EditPersonalInfoSheet';
import EditPublicProfileSheet from '@/components/account/EditPublicProfileSheet';
import ChangePasswordSheet from '@/components/account/ChangePasswordSheet';
import PaymentsPayoutsSection from '@/components/account/PaymentsPayoutsSection';
import { getDisplayInitials } from '@/lib/displayName';
// keep _s to silence unused-import lint if tooling flags icon presets; not rendered.
void _s;

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

const SECTIONS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'more', label: 'More', icon: FileText },
];

function maskPhonePreview(p: string) {
  const d = p.replace(/\D/g, '');
  if (!d) return 'Not on file';
  return `••• ••• ${d.slice(-4)}`;
}

const Account = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  usePageTracking();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProfileRow>(EMPTY);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [openPersonal, setOpenPersonal] = useState(false);
  const [openPublic, setOpenPublic] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name, email, avatar_url, header_image_url, display_name, username, business_name, public_city, public_state, phone_number, identity_verified')
      .eq('id', user.id)
      .single();
    if (error) { toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' }); return; }
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
    if (!user) { navigate('/auth'); return; }
    (async () => { await loadProfile(); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Scroll-spy for the sticky sub-nav on desktop.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id.replace('section-', '')); });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [loading]);

  const initials = useMemo(() => getDisplayInitials({
    first_name: row.first_name, last_name: row.last_name, full_name: row.full_name,
  }), [row]);

  const publicProfileHref = row.username ? `/u/${row.username}` : `/profile/${user?.id}`;

  const handleAvatarQuickUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Up to 5MB', variant: 'destructive' }); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
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
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        <Footer />
      </div>
    );
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(id); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Mobile back */}
        <div className="md:hidden border-b border-border">
          <div className="container py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        </div>

        <div className="container max-w-5xl py-8 pb-16">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold font-display text-foreground">Account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your profile, security, and payment settings — nothing else lives here.
            </p>
          </div>

          {/* Identity summary */}
          <div className="mb-8">
            <IdentitySummaryCard
              name={row.display_name || row.full_name || 'Your account'}
              subtitle={row.email}
              avatarUrl={row.avatar_url}
              initials={initials}
              verified={row.identity_verified}
              onAvatarClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file'; inp.accept = 'image/*';
                inp.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleAvatarQuickUpload(f);
                };
                inp.click();
              }}
              isUploadingAvatar={uploadingAvatar}
              publicProfileHref={publicProfileHref}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenPublic(true)}>
                Edit public profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(publicProfileHref)}>
                <Eye className="h-4 w-4 mr-2" />Preview
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Sticky sub-nav (desktop) */}
            <aside className="hidden lg:block w-52 shrink-0">
              <nav className="space-y-1 sticky top-24">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                      activeSection === s.id
                        ? 'bg-muted font-semibold text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="flex-1 min-w-0 space-y-8">
              {/* 2. Personal info */}
              <SectionCard id="section-personal" title="Personal info" description="Name, email, and phone. Private to you.">
                <RowLink
                  icon={User}
                  label={row.full_name || 'Add your legal name'}
                  hint="Locked — used for identity verification and payouts."
                  onClick={() => setOpenPersonal(true)}
                />
                <RowLink
                  icon={FileText}
                  label={row.email || 'Add an email'}
                  hint="Receipts, alerts, and account recovery."
                  onClick={() => setOpenPersonal(true)}
                />
                <RowLink
                  icon={Lock}
                  label={maskPhonePreview(row.phone_number)}
                  hint="Locked — reveal to view, contact support to change."
                  onClick={() => setOpenPersonal(true)}
                />
              </SectionCard>

              {/* 3. Sign-in & security */}
              <SectionCard id="section-security" title="Sign-in & security" description="Password and connected accounts.">
                <RowLink
                  icon={KeyRound}
                  label="Change password"
                  hint="Use a strong password unique to Vendibook."
                  onClick={() => setOpenPassword(true)}
                />
                <RowLink
                  icon={Shield}
                  label="Connected sign-ins"
                  hint={authProfile?.email ? `Email · ${authProfile.email}` : 'Email sign-in only.'}
                  onClick={() => toast({ title: 'Only email sign-in is enabled', description: 'Social sign-in providers can be added later from your provider settings.' })}
                />
              </SectionCard>

              {/* 4. Payments & payouts */}
              <PaymentsPayoutsSection />

              {/* 5. Privacy & sharing */}
              {user && (
                <section id="section-privacy" className="scroll-mt-24">
                  <div className="mb-3 px-1">
                    <h2 className="text-base font-semibold text-foreground font-display">Privacy & sharing</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Control exactly what your public storefront shows.</p>
                  </div>
                  <PrivacySharingSection userId={user.id} username={row.username} />
                </section>
              )}

              {/* 6. Row links out */}
              <SectionCard id="section-more" title="More" description="Everything else lives in its own dedicated place.">
                <RowLink
                  icon={Bell}
                  label="Notifications"
                  hint="Email, push, and SMS preferences."
                  to="/notification-preferences"
                />
                <RowLink
                  icon={CreditCard}
                  label="Membership & billing"
                  hint="Your plan, invoices, and add-ons."
                  to="/account/subscription"
                />
                <RowLink
                  icon={ShieldCheck}
                  label="Identity verification"
                  hint={row.identity_verified ? 'Verified — manage or re-run at any time.' : 'Verify your ID to unlock trust badges.'}
                  to="/verify-identity"
                  rightSlot={row.identity_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-semibold px-2 py-0.5 border border-emerald-500/30">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-semibold px-2 py-0.5 border border-amber-500/30">
                      Recommended
                    </span>
                  )}
                />
                <RowLink
                  icon={FileText}
                  label="Legal & policies"
                  hint="Terms, privacy, refund, and marketplace rules."
                  to="/legal"
                />
              </SectionCard>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Sheets */}
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
    </div>
  );
};

export default Account;
